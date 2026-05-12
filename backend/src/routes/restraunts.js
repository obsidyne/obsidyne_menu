import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/restaurants
 * @desc    Get all restaurants
 * @access  Private (Admin only)
 */
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const { search, isActive } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      include: {
        _count: {
          select: {
            menus: true,
            users: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
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
 * @access  Private
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin or belongs to this restaurant
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        menus: {
          orderBy: { createdAt: 'desc' }
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
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
 * @route   POST /api/restaurants
 * @desc    Create new restaurant
 * @access  Private (Admin only)
 */
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, description, address, phone, email, logo, isActive } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Restaurant name is required' });
    }

    // Email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        description,
        address,
        phone,
        email,
        logo,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        _count: {
          select: {
            menus: true,
            users: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PUT /api/restaurants/:id
 * @desc    Update restaurant
 * @access  Private (Admin only)
 */
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, address, phone, email, logo, isActive } = req.body;

    // Check if restaurant exists
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!existingRestaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Validation
    if (name === '') {
      return res.status(400).json({ error: 'Restaurant name cannot be empty' });
    }

    // Email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    const updateData = {};
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
 * @desc    Delete restaurant
 * @access  Private (Admin only)
 */
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if restaurant exists
    const existingRestaurant = await prisma.restaurant.findUnique({
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

    if (!existingRestaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Delete restaurant (cascade will handle related records)
    await prisma.restaurant.delete({
      where: { id }
    });

    res.json({
      message: 'Restaurant deleted successfully',
      deletedCount: {
        menus: existingRestaurant._count.menus,
        users: existingRestaurant._count.users
      }
    });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PATCH /api/restaurants/:id/toggle-status
 * @desc    Toggle restaurant active status
 * @access  Private (Admin only)
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
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/restaurants/:id/menus
 * @desc    Get all menus for a specific restaurant
 * @access  Private (Admin or Restaurant User)
 */
router.get('/:id/menus', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const menus = await prisma.menu.findMany({
      where: { restaurantId: id },
      include: {
        _count: {
          select: {
            categories: true,
            dishes: true,
            combos: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(menus);
  } catch (error) {
    console.error('Get restaurant menus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;