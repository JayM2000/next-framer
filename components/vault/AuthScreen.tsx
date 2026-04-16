'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';

export default function AuthScreen() {
  const { dispatch, showToast } = useVault();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'vault123') {
      dispatch({ type: 'LOGIN', username });
      showToast('Welcome back, Admin 🔓');
    } else {
      setError('Invalid credentials');
      setShakeKey(k => k + 1);
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--vault-bg)]/80 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-6 flex flex-col items-center gap-2"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--vault-gold)] to-[var(--vault-gold-light)] shadow-lg shadow-[var(--vault-gold)]/20">
            <Shield className="h-8 w-8 text-[#0a0a0f]" />
          </div>
          <h1 className="vault-heading text-2xl font-bold tracking-wider text-[var(--vault-gold)]">
            VAULT
          </h1>
          <p className="text-xs text-[var(--vault-muted)]">Unlock your private vault</p>
        </motion.div>

        {/* Login Card */}
        <motion.form
          key={shakeKey}
          animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit}
          className="vault-glass-card space-y-4 rounded-2xl border border-[var(--vault-border)] p-6"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--vault-muted)]">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="vault-input"
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--vault-muted)]">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="vault-input pr-10"
                placeholder="Enter password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400"
            >
              {error}
            </motion.p>
          )}

          <button
            id="login-submit"
            type="submit"
            className="vault-btn-primary w-full"
          >
            <Lock className="h-4 w-4" /> Unlock Vault
          </button>

          <p className="text-center text-[10px] text-[var(--vault-muted)]">
            Demo: admin / vault123
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
