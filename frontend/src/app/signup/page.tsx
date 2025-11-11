'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      // User is automatically signed in, redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-aviation-cloud-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-aviation-sky-700">
              Flight Schedule Pro
            </h1>
            <p className="mt-2 text-aviation-cloud-600">Create your account</p>
          </div>

          {error && (
            <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-aviation-cloud-300 px-3 py-2 focus:border-aviation-sky-500 focus:outline-none focus:ring-1 focus:ring-aviation-sky-500"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-aviation-cloud-300 px-3 py-2 focus:border-aviation-sky-500 focus:outline-none focus:ring-1 focus:ring-aviation-sky-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-aviation-cloud-300 px-3 py-2 focus:border-aviation-sky-500 focus:outline-none focus:ring-1 focus:ring-aviation-sky-500"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-aviation-cloud-500">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-aviation-cloud-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
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
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-aviation-cloud-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-aviation-sky-600 hover:text-aviation-sky-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

