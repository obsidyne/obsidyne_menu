// backend/routes/dishes.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { processImage } from '../utils/imageProcessor.js';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   POST /api/dishes/upload
 * @desc    Upload dish image and convert to WebP
 * @access  Private
 */
router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Process image and create WebP version
    const { originalUrl, webpUrl } = await processImage(
      req.file.path,
      req.file.filename
    );

    res.json({
      originalUrl,
      webpUrl,
      message: 'Image uploaded and processed successfully'
    });
  } catch (error) {
    // Clean up uploaded file if processing fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload and process image' });
  }
});

/**
 * @route   GET /api/dishes
 * @desc    Get all dishes for user's restaurant menus
 * @access  Private (Admin or Restaurant User)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { menuId, categoryId } = req.query;

    let where = {};

    if (req.user.role === 'ADMIN') {
      if (menuId) where.menuId = menuId;
      if (categoryId) where.categoryId = categoryId;
    } else {
      const menus = await prisma.menu.findMany({
        where: { restaurantId: req.user.restaurantId },
        select: { id: true }
      });

      const menuIds = menus.map(m => m.id);

      if (menuId && menuIds.includes(menuId)) {
        where.menuId = menuId;
      } else {
        where.menuId = { in: menuIds };
      }

      if (categoryId) where.categoryId = categoryId;
    }

    const dishes = await prisma.dish.findMany({
      where,
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            restaurant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { categoryId: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    res.json(dishes);
  } catch (error) {
    console.error('Get dishes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/dishes/:id
 * @desc    Get single dish by ID
 * @access  Private (Admin or Restaurant User)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const dish = await prisma.dish.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        category: true
      }
    });

    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== dish.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(dish);
  } catch (error) {
    console.error('Get dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/dishes
 * @desc    Create new dish
 * @access  Private (Admin or Restaurant User)
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      image,
      isVeg,
      isVegan,
      status,
      menuId,
      categoryId
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Dish name is required' });
    }

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    if (!menuId) {
      return res.status(400).json({ error: 'Menu ID is required' });
    }

    if (!categoryId) {
      return res.status(400).json({ error: 'Category ID is required' });
    }

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: { restaurant: true }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category || category.menuId !== menuId) {
      return res.status(400).json({ error: 'Invalid category for this menu' });
    }

    // Get the highest sort order for this category and increment
    const lastDish = await prisma.dish.findFirst({
      where: { categoryId },
      orderBy: { sortOrder: 'desc' }
    });

    const sortOrder = lastDish ? lastDish.sortOrder + 1 : 0;

    const dish = await prisma.dish.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        image,
        isVeg: isVeg || false,
        isVegan: isVegan || false,
        status: status || 'AVAILABLE',
        sortOrder,
        menuId,
        categoryId
      },
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            restaurant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json(dish);
  } catch (error) {
    console.error('Create dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PUT /api/dishes/:id
 * @desc    Update dish
 * @access  Private (Admin or Restaurant User)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      image,
      isVeg,
      isVegan,
      status,
      categoryId
    } = req.body;

    const existingDish = await prisma.dish.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!existingDish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingDish.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (name === '') {
      return res.status(400).json({ error: 'Dish name cannot be empty' });
    }

    if (price !== undefined && price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    if (categoryId && categoryId !== existingDish.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category || category.menuId !== existingDish.menuId) {
        return res.status(400).json({ error: 'Invalid category for this menu' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (image !== undefined) updateData.image = image;
    if (isVeg !== undefined) updateData.isVeg = isVeg;
    if (isVegan !== undefined) updateData.isVegan = isVegan;
    if (status !== undefined) updateData.status = status;
    if (categoryId !== undefined) updateData.categoryId = categoryId;

    const dish = await prisma.dish.update({
      where: { id },
      data: updateData,
      include: {
        menu: {
          select: {
            id: true,
            name: true,
            restaurant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(dish);
  } catch (error) {
    console.error('Update dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   DELETE /api/dishes/:id
 * @desc    Delete dish
 * @access  Private (Admin or Restaurant User)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingDish = await prisma.dish.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!existingDish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingDish.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.dish.delete({
      where: { id }
    });

    res.json({ message: 'Dish deleted successfully' });
  } catch (error) {
    console.error('Delete dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PATCH /api/dishes/:id/status
 * @desc    Update dish status
 * @access  Private (Admin or Restaurant User)
 */
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['AVAILABLE', 'UNAVAILABLE', 'OUT_OF_STOCK'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const dish = await prisma.dish.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== dish.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedDish = await prisma.dish.update({
      where: { id },
      data: { status },
      include: {
        menu: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(updatedDish);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// backend/routes/dishes.js
// Add this new route to your existing dishes.js file

/**
 * @route   PATCH /api/dishes/reorder
 * @desc    Reorder dishes within a category
 * @access  Private (Admin or Restaurant User)
 */
router.patch('/reorder', auth, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, sortOrder }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    // Verify all dishes belong to user's restaurant (if not admin)
    if (req.user.role !== 'ADMIN') {
      const dishIds = updates.map(u => u.id);
      const dishes = await prisma.dish.findMany({
        where: { id: { in: dishIds } },
        include: {
          menu: {
            include: {
              restaurant: true
            }
          }
        }
      });

      const unauthorized = dishes.some(
        d => d.menu.restaurantId !== req.user.restaurantId
      );

      if (unauthorized) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update all dishes in a transaction
    await prisma.$transaction(
      updates.map(update =>
        prisma.dish.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder }
        })
      )
    );

    res.json({ message: 'Dishes reordered successfully' });
  } catch (error) {
    console.error('Reorder dishes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router;