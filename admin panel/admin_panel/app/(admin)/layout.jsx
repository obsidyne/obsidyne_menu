// src/app/(admin)/layout.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userString);
      
      // Check if user is admin
      if (userData.role !== 'ADMIN') {
        router.push('/dishes');
        return;
      }
      
      setIsChecking(false);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 ">
      <Sidebar />
      <main className="flex-1 overflow-y-auto --lg:ml-64">
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}