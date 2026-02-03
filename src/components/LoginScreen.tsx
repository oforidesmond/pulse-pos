import React, { useState } from 'react';
import { ShoppingCart, Lock, User } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

const LOGIN_API_URL = import.meta.env.VITE_AUTH_API_URL ?? 'https://sika-ventures-admin.vercel.app/api/auth/login';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message = data?.error || `Unable to login (status ${response.status}).`;
        throw new Error(message);
      }

      // Store auth token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      onLogin();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-12 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-teal-500 rounded-3xl p-6 mb-6">
            <ShoppingCart className="w-16 h-16 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-center mb-2">Sika Ventures POS</h1>
          <p className="text-gray-500 text-center">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block mb-3 text-gray-700">Username</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-16 pr-6 py-5 border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-3 text-gray-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-16 pr-6 py-5 border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-500 to-teal-500 text-white py-6 rounded-2xl hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-8 text-sm">Version 1.0.0</p>
      </div>
    </div>
  );
}
