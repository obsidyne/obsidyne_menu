// backend/routes/public.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Helper: resolve a restaurant by slug OR uuid
 * Returns the restaurant row or null.
 */
const findRestaurantByIdentifier = (identifier) => {
  // UUIDs match the standard 8-4-4-4-12 hex pattern
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

  return prisma.restaurant.findFirst({
    where: isUUID ? { id: identifier } : { slug: identifier },
  });
};

/**
 * @route   GET /api/public/restaurant/:identifier
 * @desc    Get restaurant details with active menus (public)
 *          :identifier can be a UUID or a slug
 * @access  Public
 */
router.get('/restaurant/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    const base = await findRestaurantByIdentifier(identifier);

    if (!base) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!base.isActive) {
      return res.status(403).json({ error: 'Restaurant is currently inactive' });
    }

    // Re-fetch with the full shape we need (avoids duplicating select in helper)
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: base.id },
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        address: true,
        phone: true,
        email: true,
        slug: true,
        isActive: true,
        menus: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
    });

    res.json(restaurant);
  } catch (error) {
    console.error('Get public restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/public/menu/:menuId
 * @desc    Get complete menu with categories and dishes (public)
 * @access  Public
 */
router.get('/menu/:menuId', async (req, res) => {
  try {
    const { menuId } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            description: true,
            logo: true,
            address: true,
            phone: true,
            slug: true,
            isActive: true,
          },
        },
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            dishes: {
              where: { status: 'AVAILABLE' },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
                isVeg: true,
                isVegan: true,
                status: true,
                sortOrder: true,
                categoryId: true,
              },
            },
          },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    if (!menu.isActive) {
      return res.status(403).json({ error: 'This menu is currently inactive' });
    }

    if (!menu.restaurant.isActive) {
      return res.status(403).json({ error: 'Restaurant is currently inactive' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Get public menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/public/menu/:menuId/categories
 * @desc    Get all categories for a menu (public)
 * @access  Public
 */
router.get('/menu/:menuId/categories', async (req, res) => {
  try {
    const { menuId } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: { restaurant: { select: { isActive: true } } },
    });

    if (!menu || !menu.isActive || !menu.restaurant.isActive) {
      return res.status(404).json({ error: 'Menu not available' });
    }

    const categories = await prisma.category.findMany({
      where: { menuId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        sortOrder: true,
        _count: {
          select: { dishes: { where: { status: 'AVAILABLE' } } },
        },
      },
    });

    res.json(categories);
  } catch (error) {
    console.error('Get public categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/public/menu/:menuId/dishes
 * @desc    Get all available dishes for a menu (public)
 * @access  Public
 */
router.get('/menu/:menuId/dishes', async (req, res) => {
  try {
    const { menuId } = req.params;
    const { categoryId } = req.query;

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: { restaurant: { select: { isActive: true } } },
    });

    if (!menu || !menu.isActive || !menu.restaurant.isActive) {
      return res.status(404).json({ error: 'Menu not available' });
    }

    const where = { menuId, status: 'AVAILABLE' };
    if (categoryId) where.categoryId = categoryId;

    const dishes = await prisma.dish.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        image: true,
        isVeg: true,
        isVegan: true,
        status: true,
        sortOrder: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
    });

    res.json(dishes);
  } catch (error) {
    console.error('Get public dishes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/public/menu/:menuId/combos
 * @desc    Get all active combos for a menu (public)
 * @access  Public
 */
router.get('/menu/:menuId/combos', async (req, res) => {
  try {
    const { menuId } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: { restaurant: { select: { isActive: true } } },
    });

    if (!menu || !menu.isActive || !menu.restaurant.isActive) {
      return res.status(404).json({ error: 'Menu not available' });
    }

    const combos = await prisma.combo.findMany({
      where: { menuId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        comboDishes: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                price: true,
                image: true,
                isVeg: true,
                isVegan: true,
              },
            },
          },
        },
      },
    });

    res.json(combos);
  } catch (error) {
    console.error('Get public combos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/public/dish/:dishId
 * @desc    Get single dish details (public)
 * @access  Public
 */
router.get('/dish/:dishId', async (req, res) => {
  try {
    const { dishId } = req.params;

    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      include: {
        category: { select: { id: true, name: true } },
        menu: {
          select: {
            id: true,
            name: true,
            isActive: true,
            restaurant: {
              select: { id: true, name: true, slug: true, isActive: true },
            },
          },
        },
      },
    });

    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    if (dish.status !== 'AVAILABLE') {
      return res.status(403).json({ error: 'Dish is currently unavailable' });
    }

    if (!dish.menu.isActive || !dish.menu.restaurant.isActive) {
      return res.status(403).json({ error: 'This dish is currently unavailable' });
    }

    res.json(dish);
  } catch (error) {
    console.error('Get public dish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/public/combo/:comboId
 * @desc    Get single combo details (public)
 * @access  Public
 */
router.get('/combo/:comboId', async (req, res) => {
  try {
    const { comboId } = req.params;

    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        comboDishes: {
          include: {
            dish: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                image: true,
                isVeg: true,
                isVegan: true,
              },
            },
          },
        },
        menu: {
          select: {
            id: true,
            name: true,
            isActive: true,
            restaurant: {
              select: { id: true, name: true, slug: true, isActive: true },
            },
          },
        },
      },
    });

    if (!combo) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    if (!combo.isActive) {
      return res.status(403).json({ error: 'Combo is currently unavailable' });
    }

    if (!combo.menu.isActive || !combo.menu.restaurant.isActive) {
      return res.status(403).json({ error: 'This combo is currently unavailable' });
    }

    res.json(combo);
  } catch (error) {
    console.error('Get public combo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/public/search/:identifier
 * @desc    Search dishes and combos in a restaurant (public)
 *          :identifier can be a UUID or a slug
 * @access  Public
 */
router.get('/search/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const restaurant = await findRestaurantByIdentifier(identifier);

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const searchTerm = q.trim().toLowerCase();

    const menus = await prisma.menu.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      select: { id: true },
    });

    if (menus.length === 0) {
      return res.json({ dishes: [], combos: [] });
    }

    const menuIds = menus.map((m) => m.id);

    const [dishes, combos] = await Promise.all([
      prisma.dish.findMany({
        where: {
          menuId: { in: menuIds },
          status: 'AVAILABLE',
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          isVeg: true,
          isVegan: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
        take: 20,
      }),
      prisma.combo.findMany({
        where: {
          menuId: { in: menuIds },
          isActive: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        include: {
          comboDishes: {
            include: {
              dish: { select: { id: true, name: true, image: true } },
            },
          },
        },
        take: 10,
      }),
    ]);

    res.json({ dishes, combos });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;