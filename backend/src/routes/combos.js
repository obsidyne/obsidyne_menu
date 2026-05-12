// backend/routes/combos.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/combos
 * @desc    Get all combos for user's restaurant menus
 * @access  Private (Admin or Restaurant User)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { menuId } = req.query;

    let where = {};

    if (req.user.role === 'ADMIN') {
      if (menuId) where.menuId = menuId;
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
    }

    const combos = await prisma.combo.findMany({
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
        comboDishes: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                isVeg: true,
                isVegan: true
              }
            }
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    res.json(combos);
  } catch (error) {
    console.error('Get combos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/combos/:id
 * @desc    Get single combo by ID
 * @access  Private (Admin or Restaurant User)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const combo = await prisma.combo.findUnique({
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
        comboDishes: {
          include: {
            dish: true
          }
        }
      }
    });

    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== combo.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(combo);
  } catch (error) {
    console.error('Get combo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/combos
 * @desc    Create new combo
 * @access  Private (Admin or Restaurant User)
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      image,
      discount,
      isActive,
      menuId,
      dishes // Array of { dishId, quantity }
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Combo name is required' });
    }

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    if (!menuId) {
      return res.status(400).json({ error: 'Menu ID is required' });
    }

    if (!dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return res.status(400).json({ error: 'At least one dish is required' });
    }

    // Check if menu exists
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: { restaurant: true }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify all dishes exist and belong to the same menu
    const dishIds = dishes.map(d => d.dishId);
    const dishRecords = await prisma.dish.findMany({
      where: {
        id: { in: dishIds },
        menuId: menuId
      }
    });

    if (dishRecords.length !== dishIds.length) {
      return res.status(400).json({ error: 'One or more dishes are invalid or do not belong to this menu' });
    }

    // Get the highest sort order and increment
    const lastCombo = await prisma.combo.findFirst({
      where: { menuId },
      orderBy: { sortOrder: 'desc' }
    });

    const sortOrder = lastCombo ? lastCombo.sortOrder + 1 : 0;

    // Create combo with dishes in a transaction
    const combo = await prisma.$transaction(async (tx) => {
      const newCombo = await tx.combo.create({
        data: {
          name,
          description,
          price: parseFloat(price),
          image,
          discount: discount ? parseFloat(discount) : 0,
          isActive: isActive !== undefined ? isActive : true,
          sortOrder,
          menuId
        }
      });

      // Create combo dishes
      await tx.comboDish.createMany({
        data: dishes.map(dish => ({
          comboId: newCombo.id,
          dishId: dish.dishId,
          quantity: dish.quantity || 1
        }))
      });

      return newCombo;
    });

    // Fetch the complete combo with relations
    const completeCombo = await prisma.combo.findUnique({
      where: { id: combo.id },
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
        comboDishes: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                isVeg: true,
                isVegan: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(completeCombo);
  } catch (error) {
    console.error('Create combo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PUT /api/combos/:id
 * @desc    Update combo
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
      discount,
      isActive,
      dishes // Array of { dishId, quantity }
    } = req.body;

    // Check if combo exists
    const existingCombo = await prisma.combo.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!existingCombo) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingCombo.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validation
    if (name === '') {
      return res.status(400).json({ error: 'Combo name cannot be empty' });
    }

    if (price !== undefined && price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    // If dishes are being updated, verify them
    if (dishes) {
      if (!Array.isArray(dishes) || dishes.length === 0) {
        return res.status(400).json({ error: 'At least one dish is required' });
      }

      const dishIds = dishes.map(d => d.dishId);
      const dishRecords = await prisma.dish.findMany({
        where: {
          id: { in: dishIds },
          menuId: existingCombo.menuId
        }
      });

      if (dishRecords.length !== dishIds.length) {
        return res.status(400).json({ error: 'One or more dishes are invalid or do not belong to this menu' });
      }
    }

    // Update combo in a transaction
    const combo = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (image !== undefined) updateData.image = image;
      if (discount !== undefined) updateData.discount = parseFloat(discount);
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedCombo = await tx.combo.update({
        where: { id },
        data: updateData
      });

      // Update combo dishes if provided
      if (dishes) {
        // Delete existing combo dishes
        await tx.comboDish.deleteMany({
          where: { comboId: id }
        });

        // Create new combo dishes
        await tx.comboDish.createMany({
          data: dishes.map(dish => ({
            comboId: id,
            dishId: dish.dishId,
            quantity: dish.quantity || 1
          }))
        });
      }

      return updatedCombo;
    });

    // Fetch the complete combo with relations
    const completeCombo = await prisma.combo.findUnique({
      where: { id },
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
        comboDishes: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                isVeg: true,
                isVegan: true
              }
            }
          }
        }
      }
    });

    res.json(completeCombo);
  } catch (error) {
    console.error('Update combo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   DELETE /api/combos/:id
 * @desc    Delete combo
 * @access  Private (Admin or Restaurant User)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const existingCombo = await prisma.combo.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!existingCombo) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingCombo.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.combo.delete({
      where: { id }
    });

    res.json({ message: 'Combo deleted successfully' });
  } catch (error) {
    console.error('Delete combo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PATCH /api/combos/:id/toggle-status
 * @desc    Toggle combo active status
 * @access  Private (Admin or Restaurant User)
 */
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const combo = await prisma.combo.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== combo.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedCombo = await prisma.combo.update({
      where: { id },
      data: { isActive: !combo.isActive },
      include: {
        menu: {
          select: {
            id: true,
            name: true
          }
        },
        comboDishes: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true
              }
            }
          }
        }
      }
    });

    res.json({
      message: `Combo ${updatedCombo.isActive ? 'activated' : 'deactivated'} successfully`,
      combo: updatedCombo
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/combos/upload
 * @desc    Upload combo image and convert to WebP
 * @access  Private
 */
import upload from '../middleware/upload.js';
import { processImage } from '../utils/imageProcessor.js';
import fs from 'fs';

router.post('/upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload and process image' });
  }
});

export default router;