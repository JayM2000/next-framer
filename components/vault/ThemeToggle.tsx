'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Diagonal Corner Sweep Theme Toggle
 * 
 * Creates a full-screen overlay that sweeps diagonally across the screen
 * with the NEW theme color, then removes itself — revealing the new theme.
 * 
 * Technique: The overlay starts with clip-path covering nothing, expands
 * diagonally to cover the full screen (while theme switches underneath),
 * then fades out to reveal the new theme.
 */

// Hardcoded theme background colors for guaranteed reliability
const THEME_COLORS = {
  dark: '#0a0a0f',   // --vault-bg dark
  light: '#f5f0e8',  // --vault-bg light
};

function performDiagonalSweep(toTheme: 'dark' | 'light') {
  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const sweepColor = THEME_COLORS[toTheme];

  // Create the sweep overlay — starts invisible via clip-path
  const overlay = document.createElement('div');
  overlay.id = 'theme-sweep-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '999999',
    pointerEvents: 'none',
    backgroundColor: sweepColor,
    // Start from nothing — the sweep will expand to cover the screen
    clipPath: toTheme === 'dark'
      ? 'polygon(100% 0%, 100% 0%, 100% 0%)'    // start from top-right corner
      : 'polygon(0% 100%, 0% 100%, 0% 100%)',    // start from bottom-left corner
    willChange: 'clip-path, opacity',
  });

  document.body.appendChild(overlay);

  // Force layout computation so browser registers initial state
  void overlay.offsetHeight;

  // Phase 1: Expand the sweep diagonally to cover the full screen
  requestAnimationFrame(() => {
    Object.assign(overlay.style, {
      transition: 'clip-path 600ms cubic-bezier(0.65, 0, 0.35, 1)',
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', // full coverage
    });
  });

  // Phase 2: After sweep covers the screen, fade out to reveal the new theme
  const handleExpanded = () => {
    overlay.removeEventListener('transitionend', handleExpanded);
    
    // Now fade out the overlay
    Object.assign(overlay.style, {
      transition: 'opacity 300ms ease-out',
      opacity: '0',
    });

    const handleFaded = () => {
      overlay.remove();
    };
    overlay.addEventListener('transitionend', handleFaded, { once: true });
    // Safety cleanup
    setTimeout(handleFaded, 400);
  };

  overlay.addEventListener('transitionend', handleExpanded, { once: true });
  // Safety cleanup if transitionend never fires
  setTimeout(() => {
    if (document.getElementById('theme-sweep-overlay')) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 350);
    }
  }, 700);
}

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

    // 1. Start the diagonal sweep with the NEW theme color
    performDiagonalSweep(nextTheme);

    // 2. Switch theme halfway through the sweep (when overlay mostly covers screen)
    setTimeout(() => {
      setTheme(nextTheme);
    }, 300);

    // 3. Re-enable toggle after animation completes
    setTimeout(() => {
      isAnimating.current = false;
    }, 1000);
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
