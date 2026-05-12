// src/app/menu/[slug]/page.jsx
//
// Route parameter is now called [slug] — rename the folder from
// app/menu/[restaurantId]  →  app/menu/[slug]
// The page accepts either a restaurant slug (e.g. "the-golden-fork") or a
// legacy UUID so existing QR codes / links keep working.
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

export default function MenuPage() {
  const params = useParams();
  // param name matches the folder [slug]; falls back gracefully if still [restaurantId]
//   const identifier = params.slug ?? params.restaurantId;
  const identifier = 'lords';

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // We store the resolved restaurantId (UUID) once we get it from the API
  // so that cart storage and search always use a stable key.
  const restaurantIdRef = useRef(null);

  useEffect(() => {
    fetchMenuData();
  }, [identifier]);

  // Persist cart whenever it changes (only after we have the restaurant id)
  useEffect(() => {
    if (restaurantIdRef.current) {
      localStorage.setItem(`cart_${restaurantIdRef.current}`, JSON.stringify(cart));
    }
  }, [cart]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchMenuData = async () => {
    try {
      setLoading(true);

      // Works with both slug and UUID thanks to the updated backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/public/restaurant/${identifier}`
      );

      if (!response.ok) {
        if (response.status === 404) throw new Error('Restaurant not found');
        if (response.status === 403) throw new Error('Restaurant is currently closed');
        throw new Error('Failed to load restaurant');
      }

      const restaurantData = await response.json();
      setRestaurant(restaurantData);

      // Stable UUID for cart keys and search calls
      restaurantIdRef.current = restaurantData.id;
      loadCartFromStorage(restaurantData.id);

      const activeMenu = restaurantData.menus?.[0];
      if (!activeMenu) {
        toast.error('No menu available at the moment');
        setLoading(false);
        return;
      }

      const menuResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/public/menu/${activeMenu.id}`
      );

      if (!menuResponse.ok) throw new Error('Failed to load menu');

      const menuData = await menuResponse.json();
      setMenu(menuData);

      const categoriesWithDishes = menuData.categories ?? [];
      setCategories(categoriesWithDishes);
      setDishes(categoriesWithDishes.flatMap((cat) => cat.dishes ?? []));
    } catch (error) {
      toast.error(error.message || 'Failed to load menu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Search ───────────────────────────────────────────────────────────────

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query || query.trim().length < 2) {
      fetchMenuData();
      return;
    }

    try {
      // Use the resolved UUID for search so the backend can do a simple id lookup
      const searchId = restaurantIdRef.current ?? identifier;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/public/search/${searchId}?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setDishes(data.dishes ?? []);
      setSelectedCategory('all');
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    }
  };

  // ─── Cart ─────────────────────────────────────────────────────────────────

  const loadCartFromStorage = (id) => {
    try {
      const saved = localStorage.getItem(`cart_${id}`);
      if (saved) setCart(JSON.parse(saved));
    } catch {
      // ignore parse errors
    }
  };

  const addToCart = (dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === dish.id && i.type === 'dish');
      if (existing) {
        return prev.map((i) =>
          i.id === dish.id && i.type === 'dish' ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { id: dish.id, type: 'dish', name: dish.name, price: dish.price, image: dish.image, quantity: 1 },
      ];
    });
    toast.success(`${dish.name} added to cart`);
  };

  const removeFromCart = (itemId, type) =>
    setCart((prev) => prev.filter((i) => !(i.id === itemId && i.type === type)));

  const updateQuantity = (itemId, type, qty) => {
    if (qty === 0) { removeFromCart(itemId, type); return; }
    setCart((prev) =>
      prev.map((i) => (i.id === itemId && i.type === type ? { ...i, quantity: qty } : i))
    );
  };

  const clearCart = () => {
    setCart([]);
    if (restaurantIdRef.current) localStorage.removeItem(`cart_${restaurantIdRef.current}`);
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // ─── Derived display data ─────────────────────────────────────────────────

  const filteredDishes =
    selectedCategory === 'all' ? dishes : dishes.filter((d) => d.categoryId === selectedCategory);

  const dishesByCategory = categories
    .map((cat) => ({ ...cat, dishes: dishes.filter((d) => d.categoryId === cat.id) }))
    .filter((c) => c.dishes.length > 0);

  // ─── Canonical slug URL helper ────────────────────────────────────────────
  // Used in nav links so they always point to the slug version
  const baseUrl = restaurant?.slug ? `/menu/${restaurant.slug}` : `/menu/${identifier}`;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (!restaurant || !menu) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Menu not available</h2>
          <p className="text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-20">
        {/* ── Header ── */}
        <header className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo / Name */}
              <div className="flex items-center gap-3">
                {restaurant.logo ? (
                  <img
                    src={restaurant.logo}
                    alt={restaurant.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-gray-900 font-bold text-lg">
                      {restaurant.name.charAt(0)}
                    </span>
                  </div>
                )}
                <h1 className="text-xl font-serif text-yellow-500 tracking-wider">
                  {restaurant.name.toUpperCase()}
                </h1>
              </div>

              {/* Search + Cart */}
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search dishes..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-64"
                  />
                </div>

                <button
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  className="relative p-2 bg-yellow-500 rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Category Filter ── */}
        <div className="sticky top-16 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                All
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-yellow-500 text-gray-900'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {searchQuery ? (
            <div>
              <h2 className="text-xl font-serif text-yellow-500 mb-6">
                Search results for &ldquo;{searchQuery}&rdquo;
              </h2>
              {filteredDishes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No dishes found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredDishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} onAddToCart={addToCart} />
                  ))}
                </div>
              )}
            </div>
          ) : selectedCategory === 'all' ? (
            <div className="space-y-12">
              {dishesByCategory.map((cat) => (
                <section key={cat.id}>
                  <h2 className="text-2xl font-serif text-yellow-500 mb-6 tracking-wide">
                    {cat.name.toUpperCase()}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cat.dishes.map((dish) => (
                      <DishCard key={dish.id} dish={dish} onAddToCart={addToCart} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredDishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} onAddToCart={addToCart} />
              ))}
            </div>
          )}

          {filteredDishes.length === 0 && selectedCategory !== 'all' && !searchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-400">No dishes available in this category</p>
            </div>
          )}
        </main>

        {/* ── Bottom Navigation ── */}
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 py-3 px-4">
          <div className="max-w-7xl mx-auto flex justify-around items-center">
            <Link href={baseUrl} className="flex flex-col items-center gap-1 text-yellow-500">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              </svg>
              <span className="text-xs font-medium">MENU</span>
            </Link>

            <Link
              href={`${baseUrl}/combos`}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-xs font-medium">COMBOS</span>
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-300"
            >
              <div className="relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">MY ORDER</span>
            </button>
          </div>
        </nav>

        {/* ── Cart Sidebar ── */}
        {isCartOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsCartOpen(false)} />

            <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-gray-900 z-50 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif text-yellow-500">MY ORDER</h2>
                  <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="text-gray-400">Your cart is empty</p>
                    <button onClick={() => setIsCartOpen(false)} className="mt-4 text-yellow-500 hover:text-yellow-400">
                      Start ordering
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 bg-gray-800 rounded-lg p-4">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                          )}

                          <div className="flex-1">
                            <h3 className="font-medium text-white">{item.name}</h3>
                            <p className="text-yellow-500 text-sm">₹{item.price.toFixed(2)}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.type, item.quantity - 1)}
                              className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>

                            <span className="w-8 text-center font-medium">{item.quantity}</span>

                            <button
                              onClick={() => updateQuantity(item.id, item.type, item.quantity + 1)}
                              className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id, item.type)}
                            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-800 pt-4 space-y-3">
                      <div className="flex justify-between text-lg">
                        <span className="text-gray-400">Total</span>
                        <span className="text-yellow-500 font-bold text-2xl">₹{cartTotal.toFixed(2)}</span>
                      </div>

                      <button className="w-full bg-yellow-500 text-gray-900 py-3 rounded-lg font-bold hover:bg-yellow-600 transition-colors">
                        PLACE ORDER
                      </button>

                      <button
                        onClick={clearCart}
                        className="w-full border border-gray-700 text-gray-400 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Dish Card ──────────────────────────────────────────────────────────────

function DishCard({ dish, onAddToCart }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700 hover:border-yellow-500/50 transition-all group">
      <div className="relative h-48 overflow-hidden">
        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="text-yellow-500 font-bold">₹{dish.price.toFixed(2)}</span>
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          {dish.isVeg && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">VEG</span>
          )}
          {dish.isVegan && (
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full font-medium">VEGAN</span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-serif text-white mb-2">{dish.name}</h3>
        <p className="text-sm text-gray-400 mb-4 line-clamp-2 h-10">
          {dish.description || 'Exquisite flavours crafted with premium ingredients'}
        </p>

        <button
          onClick={() => onAddToCart(dish)}
          className="w-full bg-yellow-500 text-gray-900 py-2 rounded-lg font-bold hover:bg-yellow-600 transition-colors"
        >
          ADD TO SELECTION
        </button>
      </div>
    </div>
  );
}