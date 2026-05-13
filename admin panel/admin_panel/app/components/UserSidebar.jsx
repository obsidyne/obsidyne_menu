// src/components/UserSidebar.jsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function UserSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userData = JSON.parse(userString);
      setUser(userData);
      
      // Fetch restaurant info using profile endpoint (which user has access to)
      if (userData.restaurantId) {
        fetchRestaurantInfo();
      }
    }
  }, []);

  const fetchRestaurantInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Use the profile endpoint which includes restaurant info
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch profile');

      const data = await response.json();
      
      if (data.restaurant) {
        setRestaurant(data.restaurant);
      }
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    {
      name: 'Dishes',
      path: '/dishes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      name: 'Categories',
      path: '/categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    },
    {
      name: 'Combos',
      path: '/combos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg"
        onClick={() => {
          const sidebar = document.getElementById('user-sidebar');
          sidebar.classList.toggle('-translate-x-full');
        }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        id="user-sidebar"
        className="fixed left-0 top-0 h-full w-64 bg-blue-600 text-white shadow-lg transform -translate-x-full lg:translate-x-0 transition-transform duration-200 ease-in-out z-40"
      >
        <div className="flex flex-col h-full">
          {/* Restaurant Header */}
          <div className="p-6 border-b border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              {restaurant?.logo ? (
                <img 
                  src={restaurant.logo} 
                  alt={restaurant.name} 
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {restaurant?.name?.charAt(0) || 'R'}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold">
                  {restaurant?.name || 'Restaurant'}
                </h2>
                <p className="text-xs text-blue-200">Menu Management</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-6 py-4 border-b border-blue-500">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">{user?.name || 'User'}</p>
                <p className="text-xs text-blue-200 uppercase">{user?.role || 'USER'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6">
            <ul className="space-y-2 px-3">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'text-blue-100 hover:bg-blue-700'
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-blue-500">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <div
        className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 hidden"
        id="sidebar-overlay"
        onClick={() => {
          const sidebar = document.getElementById('user-sidebar');
          sidebar.classList.add('-translate-x-full');
        }}
      />
    </>
  );
}