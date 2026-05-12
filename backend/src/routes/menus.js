// backend/routes/menus.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import auth from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/menus/:id
 * @desc    Get single menu by ID
 * @access  Private (Admin or Restaurant User)
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true
          }
        },
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: {
            categories: true,
            dishes: true,
            combos: true
          }
        }
      }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/menus
 * @desc    Create new menu
 * @access  Private (Admin or Restaurant User)
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isActive, restaurantId, config } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Menu name is required' });
    }

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    // Check if restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const menu = await prisma.menu.create({
      data: {
        name,
        description,
        isActive: isActive !== undefined ? isActive : true,
        restaurantId,
        config: config || {}
      },
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

    res.status(201).json(menu);
  } catch (error) {
    console.error('Create menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PUT /api/menus/:id
 * @desc    Update menu
 * @access  Private (Admin or Restaurant User)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, config } = req.body;

    // Check if menu exists
    const existingMenu = await prisma.menu.findUnique({
      where: { id }
    });

    if (!existingMenu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingMenu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validation
    if (name === '') {
      return res.status(400).json({ error: 'Menu name cannot be empty' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (config !== undefined) updateData.config = config;

    const menu = await prisma.menu.update({
      where: { id },
      data: updateData,
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

    res.json(menu);
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   DELETE /api/menus/:id
 * @desc    Delete menu
 * @access  Private (Admin or Restaurant User)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if menu exists
    const existingMenu = await prisma.menu.findUnique({
      where: { id },
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

    if (!existingMenu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== existingMenu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete menu (cascade will handle related records)
    await prisma.menu.delete({
      where: { id }
    });

    res.json({
      message: 'Menu deleted successfully',
      deletedCount: {
        categories: existingMenu._count.categories,
        dishes: existingMenu._count.dishes,
        combos: existingMenu._count.combos
      }
    });
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   POST /api/menus/:id/generate-qr
 * @desc    Generate QR code for menu
 * @access  Private (Admin or Restaurant User)
 */
router.post('/:id/generate-qr', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if menu exists
    const menu = await prisma.menu.findUnique({
      where: { id }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate menu URL (adjust this to your actual frontend URL)
    const menuUrl = `${process.env.MENU_FRONTEND_URL || 'http://localhost:3001'}/menu/${id}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });

    // Update menu with QR code
    const updatedMenu = await prisma.menu.update({
      where: { id },
      data: { qrCode: qrCodeDataUrl },
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

    res.json(updatedMenu);
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   PATCH /api/menus/:id/toggle-status
 * @desc    Toggle menu active status
 * @access  Private (Admin or Restaurant User)
 */
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { id }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && req.user.restaurantId !== menu.restaurantId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedMenu = await prisma.menu.update({
      where: { id },
      data: { isActive: !menu.isActive },
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

    res.json({
      message: `Menu ${updatedMenu.isActive ? 'activated' : 'deactivated'} successfully`,
      menu: updatedMenu
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/menus/qr/:qrCode
 * @desc    Get menu by QR code (public route for customers)
 * @access  Public
 */
router.get('/qr/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { qrCode },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            logo: true,
            description: true
          }
        },
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            dishes: {
              where: { status: 'AVAILABLE' },
              orderBy: { sortOrder: 'asc' }
            }
          }
        },
        combos: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            comboDishes: {
              include: {
                dish: true
              }
            }
          }
        }
      }
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    if (!menu.isActive) {
      return res.status(403).json({ error: 'This menu is currently inactive' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Get menu by QR error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;