import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { warmUpServer } from '../services/api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Keep pinging the sleeping Render dyno while the login screen is open —
  // by the time credentials are typed, the server is usually awake.
  useEffect(() => {
    warmUpServer();
    const interval = setInterval(warmUpServer, 25000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError(t('login.errorEmpty'));
      return;
    }

    setIsLoading(true);
    try {
      const success = await login({ username: username.trim(), password });
      if (!success) {
        setError(t('login.errorInvalid'));
      }
    } catch {
      setError(t('login.errorServer'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-slate-900 dark:to-emerald-950 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-2xl border border-base-200">
        <form onSubmit={handleSubmit} className="card-body gap-3">

          {/* Logo & Title */}
          <div className="text-center mb-2">
            <span className="text-5xl">🌾</span>
            <h2 className="text-2xl font-bold text-success mt-2">Agri POS</h2>
            <p className="text-xs text-base-content/50 mt-1">{t('login.subtitle')}</p>
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
              <span className="label-text font-semibold text-sm">{t('login.username')}</span>
            </label>
            <input
              type="text"
              placeholder="admin / cashier"
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
              <span className="label-text font-semibold text-sm">{t('login.password')}</span>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
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
                <><span className="loading loading-spinner loading-sm"></span> {t('login.checking')}</>
              ) : (
                t('login.signIn')
              )}
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-1 p-3 bg-base-200 rounded-xl text-xs text-base-content/50">
            <p className="font-semibold text-base-content/60 mb-1">{t('login.demoTitle')}</p>
            <p>• {t('login.demoAdmin')}: <code className="text-success font-bold">admin</code></p>
            <p>• {t('login.demoCashier')}: <code className="text-success font-bold">cashier</code></p>
          </div>
        </form>
      </div>
    </div>
  );
};
