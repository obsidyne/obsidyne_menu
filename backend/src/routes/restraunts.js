// backend/routes/restaurants.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';
import { isAdmin, isAdminOrOwner } from '../middleware/roleCheck.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Generate URL-friendly slug from restaurant name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * @route   POST /api/restaurants
 * @desc    Create a new restaurant (auto-creates Menu1)
 * @access  Admin only
 */
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, address, phone, email, logo, isActive, slug } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Restaurant name is required' });
    }

    // Generate slug from name if not provided
    const restaurantSlug = slug || generateSlug(name);

    // Check if slug already exists
    const existingSlug = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug }
    });

    if (existingSlug) {
      return res.status(400).json({ 
        error: 'A restaurant with this name already exists. Please use a different name or provide a custom slug.' 
      });
    }

    // Create restaurant and default menu in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create restaurant
      const restaurant = await tx.restaurant.create({
        data: {
          name,
          slug: restaurantSlug,
          description,
          address,
          phone,
          email,
          logo,
          isActive: isActive !== undefined ? isActive : true
        }
      });

      // Automatically create Menu1
      const menu = await tx.menu.create({
        data: {
          name: 'Menu1',
          description: `Default menu for ${name}`,
          restaurantId: restaurant.id,
          isActive: true
        }
      });

      // Return restaurant with menu included
      return {
        restaurant: {
          ...restaurant,
          menus: [menu],
          _count: {
            menus: 1,
            users: 0
          }
        },
        menu
      };
    });

    res.status(201).json({
      message: 'Restaurant created successfully with default menu',
      restaurant: result.restaurant,
      defaultMenu: result.menu
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PUT /api/restaurants/:id
 * @desc    Update a restaurant
 * @access  Admin only
 */
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, address, phone, email, logo, isActive, slug } = req.body;

    // Check if restaurant exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!existingRestaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // If name changed or slug provided, validate slug
    let newSlug = existingRestaurant.slug;
    if (name && name !== existingRestaurant.name) {
      newSlug = slug || generateSlug(name);
    } else if (slug && slug !== existingRestaurant.slug) {
      newSlug = slug;
    }

    // Check if new slug conflicts with another restaurant
    if (newSlug !== existingRestaurant.slug) {
      const slugConflict = await prisma.restaurant.findFirst({
        where: {
          slug: newSlug,
          id: { not: id }
        }
      });

      if (slugConflict) {
        return res.status(400).json({ 
          error: 'This slug is already taken by another restaurant' 
        });
      }
    }

    const updateData = {
      slug: newSlug
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (logo !== undefined) updateData.logo = logo;
    if (isActive !== undefined) updateData.isActive = isActive;

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            menus: true,
            users: true
          }
        }
      }
    });

    res.json({
      message: 'Restaurant updated successfully',
      restaurant
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   DELETE /api/restaurants/:id
 * @desc    Delete a restaurant (cascades to menus, categories, dishes, combos)
 * @access  Admin only
 */
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            menus: true,
            users: true
          }
        }
      }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Delete restaurant (cascades automatically)
    await prisma.restaurant.delete({
      where: { id }
    });

    res.json({ 
      message: 'Restaurant deleted successfully',
      deletedCount: {
        menus: restaurant._count.menus,
        users: restaurant._count.users
      }
    });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/restaurants
 * @desc    Get all restaurants
 * @access  Admin only
 */
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            menus: true,
            users: true
          }
        }
      }
    });

    res.json({ restaurants });
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/restaurants/:id
 * @desc    Get single restaurant by ID
 * @access  Admin only
 */
router.get('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        menus: {
          orderBy: { createdAt: 'desc' }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            menus: true,
            users: true
          }
        }
      }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ restaurant });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/restaurants/:id/menus
 * @desc    Get all menus for a restaurant
 * @access  Admin only
 */
router.get('/:id/menus', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const menus = await prisma.menu.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            categories: true,
            dishes: true,
            combos: true
          }
        }
      }
    });

    res.json({ menus });
  } catch (error) {
    console.error('Get restaurant menus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PATCH /api/restaurants/:id/toggle-status
 * @desc    Toggle restaurant active status
 * @access  Admin only
 */
router.patch('/:id/toggle-status', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id },
      data: { isActive: !restaurant.isActive },
      include: {
        _count: {
          select: {
            menus: true,
            users: true
          }
        }
      }
    });

    res.json({
      message: `Restaurant ${updatedRestaurant.isActive ? 'activated' : 'deactivated'} successfully`,
      restaurant: updatedRestaurant
    });
  } catch (error) {
    console.error('Toggle restaurant status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;