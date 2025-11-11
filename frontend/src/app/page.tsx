'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  async function checkAuthAndRedirect() {
    try {
      await getSession();
      // User is authenticated, redirect to dashboard
      router.replace('/dashboard');
    } catch {
      // User is not authenticated, redirect to login
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  }

  // Show loading state while checking
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-aviation-sky-600 border-r-transparent"></div>
          <p className="mt-4 text-aviation-cloud-600">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}

