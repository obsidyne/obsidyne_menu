// backend/routes/categories.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/categories
 * @desc    Get all categories for user's restaurant menus
 * @access  Private (Admin or Restaurant User)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { menuId } = req.query;

    // Build where clause
    let where = {};

    if (req.user.role === 'ADMIN') {
      // Admin can see all categories, optionally filtered by menuId
      if (menuId) {
        where.menuId = menuId;
      }
    } else {
      // Restaurant user can only see their restaurant's categories
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

    const categories = await prisma.category.findMany({
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
        _count: {
          select: {
            dishes: true
          }
        }
      },
      orderBy: [
        { menuId: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/categories/:id
 * @desc    Get single category by ID
 * @access  Private (Admin or Restaurant User)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
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
        dishes: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: {
            dishes: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== category.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Admin or Restaurant User)
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, image, menuId, sortOrder, isActive } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    if (!menuId) {
      return res.status(400).json({ error: 'Menu ID is required' });
    }

    // Check if menu exists
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: {
        restaurant: true
      }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        image,
        menuId,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive : true
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
        _count: {
          select: {
            dishes: true
          }
        }
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Admin or Restaurant User)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image, sortOrder, isActive } = req.body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingCategory.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validation
    if (name === '') {
      return res.status(400).json({ error: 'Category name cannot be empty' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.category.update({
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
        _count: {
          select: {
            dishes: true
          }
        }
      }
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (Admin or Restaurant User)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        },
        _count: {
          select: {
            dishes: true
          }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingCategory.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete category (cascade will handle related dishes)
    await prisma.category.delete({
      where: { id }
    });

    res.json({
      message: 'Category deleted successfully',
      deletedCount: {
        dishes: existingCategory._count.dishes
      }
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PATCH /api/categories/:id/toggle-status
 * @desc    Toggle category active status
 * @access  Private (Admin or Restaurant User)
 */
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        menu: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== category.menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
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
        _count: {
          select: {
            dishes: true
          }
        }
      }
    });

    res.json({
      message: `Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`,
      category: updatedCategory
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// backend/routes/categories.js
// Add these new routes to your existing categories.js file

/**
 * @route   PATCH /api/categories/reorder
 * @desc    Reorder categories
 * @access  Private (Admin or Restaurant User)
 */
router.patch('/reorder', auth, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, sortOrder }

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    // Verify all categories belong to user's restaurant (if not admin)
    if (req.user.role !== 'ADMIN') {
      const categoryIds = updates.map(u => u.id);
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        include: {
          menu: {
            include: {
              restaurant: true
            }
          }
        }
      });

      const unauthorized = categories.some(
        c => c.menu.restaurantId !== req.user.restaurantId
      );

      if (unauthorized) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update all categories in a transaction
    await prisma.$transaction(
      updates.map(update =>
        prisma.category.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder }
        })
      )
    );

    res.json({ message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export the router at the end


export default router;