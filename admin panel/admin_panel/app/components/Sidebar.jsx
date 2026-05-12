'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (path) => pathname === path ? 'bg-blue-700' : 'hover:bg-blue-700';

  const adminLinks = [
    { href: '/restaurants', label: 'Restaurants' },
    { href: '/users', label: 'Users' },
  ];

  const userLinks = [
    { href: '/dishes', label: 'Dishes' },
    { href: '/categories', label: 'Categories' },
    { href: '/combos', label: 'Combos' },
    { href: '/profile', label: 'Profile' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : userLinks;

  return (
    <div className="w-64 bg-blue-600 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-blue-500">
        <h1 className="text-xl font-bold">Hotel Menu</h1>
        <p className="text-sm text-blue-200 mt-1">{user?.name}</p>
        <p className="text-xs text-blue-300">{user?.role}</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block px-4 py-2 rounded transition ${isActive(link.href)}`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-blue-500">
        <button
          onClick={logout}
          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}