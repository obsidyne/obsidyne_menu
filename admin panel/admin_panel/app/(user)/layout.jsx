// src/app/(user)/layout.jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserSidebar from '@/components/UserSidebar';
import { Toaster } from 'react-hot-toast';

export default function UserLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      router.push('/login');
      return;
    }

    // Check if user is a restaurant user (not admin)
    const userData = JSON.parse(user);
    if (userData.role === 'ADMIN') {
      router.push('/restaurants');
      return;
    }

    // Check if user has a restaurant assigned
    if (!userData.restaurantId) {
      alert('You are not assigned to any restaurant. Please contact your administrator.');
      router.push('/login');
      return;
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-50">
      <UserSidebar />
      <main className="flex-1 overflow-y-auto lg:ml-64">
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}