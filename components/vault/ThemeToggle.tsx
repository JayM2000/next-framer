'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { performDiagonalThemeSwitch, TRANSITION_LOCK_MS } from '@/lib/theme-transition';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isAnimating = useRef(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = useCallback(() => {
    if (isAnimating.current) return; // prevent spam
    isAnimating.current = true;

    const isDark = resolvedTheme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';

    // Kick off the diagonal sweep — it calls setTheme at the right moment
    performDiagonalThemeSwitch(nextTheme, setTheme);

    // Re-enable toggle after animation completes
    setTimeout(() => {
      isAnimating.current = false;
    }, TRANSITION_LOCK_MS);
  }, [resolvedTheme, setTheme]);

  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--vault-border)] bg-[var(--vault-glass)] transition-colors hover:bg-[var(--vault-glass-hover)]"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'sun' : 'moon'}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-[var(--vault-gold)]" />
          ) : (
            <Moon className="h-4 w-4 text-[var(--vault-gold)]" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
