import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username နှင့် Password ဖြည့်စွက်ပါ');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login({ username: username.trim(), password });
      if (!success) {
        setError('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
      }
    } catch {
      setError('ဆာဗာနှင့် ချိတ်ဆက်မှု မအောင်မြင်ပါ။ Backend ဖွင့်ထားသည်မှာ သေချာပါသလား?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-2xl border border-base-200">
        <form onSubmit={handleSubmit} className="card-body gap-3">

          {/* Logo & Title */}
          <div className="text-center mb-2">
            <span className="text-5xl">🌾</span>
            <h2 className="text-2xl font-bold text-success mt-2">Agri POS</h2>
            <p className="text-xs text-gray-500 mt-1">စိုက်ပျိုးရေးဆိုင်ရာ အရောင်းစနစ်</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="alert alert-error text-sm py-2 px-3 rounded-lg">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Username */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-semibold text-sm">Username</span>
            </label>
            <input
              type="text"
              placeholder="admin သို့မဟုတ် cashier"
              className="input input-bordered focus:input-success w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Password with show/hide */}
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-semibold text-sm">Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="input input-bordered focus:input-success w-full pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="form-control mt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-success text-white font-bold w-full gap-2"
            >
              {isLoading ? (
                <><span className="loading loading-spinner loading-sm"></span> စစ်ဆေးနေသည်...</>
              ) : (
                '🔐 အကောင့်ဝင်မည်'
              )}
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-1 p-3 bg-base-200 rounded-xl text-xs text-gray-500">
            <p className="font-semibold text-gray-600 mb-1">💡 Demo Accounts (Password: 123):</p>
            <p>• Admin: <code className="text-success font-bold">admin</code></p>
            <p>• Cashier: <code className="text-success font-bold">cashier</code></p>
          </div>
        </form>
      </div>
    </div>
  );
};