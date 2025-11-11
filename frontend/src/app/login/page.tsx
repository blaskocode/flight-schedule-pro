'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-aviation-cloud-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-aviation-sky-700">
              Flight Schedule Pro
            </h1>
            <p className="mt-2 text-aviation-cloud-600">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-aviation-cloud-300 px-3 py-2 focus:border-aviation-sky-500 focus:outline-none focus:ring-1 focus:ring-aviation-sky-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-aviation-cloud-300 px-3 py-2 focus:border-aviation-sky-500 focus:outline-none focus:ring-1 focus:ring-aviation-sky-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-aviation-sky-600 px-4 py-2 font-semibold text-white hover:bg-aviation-sky-700 focus:outline-none focus:ring-2 focus:ring-aviation-sky-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-aviation-cloud-600">
              Don't have an account?{' '}
              <Link href="/signup" className="font-semibold text-aviation-sky-600 hover:text-aviation-sky-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

