// src/app/(admin)/page.jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    // If not authenticated, redirect to login
    if (!token || !userString) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userString);

      // Redirect based on role
      if (user.role === 'ADMIN') {
        // Super admin - redirect to restaurants page
        router.push('/restaurants');
      } else {
        // Restaurant user - redirect to dishes page
        router.push('/dishes');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      // If error, clear storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}