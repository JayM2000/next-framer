/**
 * Diagonal Sweep Theme Transition
 *
 * Creates a full-screen overlay that sweeps diagonally across the screen,
 * revealing the NEW theme underneath. The overlay is painted with the
 * incoming theme's background color and uses CSS clip-path to animate
 * from one corner to full coverage, then fades out.
 *
 * Direction:
 *   → Switching to DARK:  sweeps from top-right corner
 *   → Switching to LIGHT: sweeps from bottom-left corner
 */

// Hard-coded theme backgrounds so the overlay can render before
// CSS custom properties have flipped.
const THEME_BG: Record<string, string> = {
  dark: '#0a0a0f',
  light: '#f5f0e8',
};

const SWEEP_DURATION = 650;   // ms – clip-path expand
const FADE_DURATION  = 320;   // ms – opacity fade-out
const THEME_FLIP_AT  = 320;   // ms – flip the theme underneath mid-sweep

/**
 * Call this instead of `setTheme()`. It performs the visual sweep and
 * calls `setTheme` at the right moment.
 */
export function performDiagonalThemeSwitch(
  nextTheme: string,
  setTheme: (t: string) => void,
): Promise<void> {
  // Skip if the overlay is already running
  if (document.getElementById('theme-sweep-overlay')) return Promise.resolve();
  // Respect reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTheme(nextTheme);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const sweepColor = THEME_BG[nextTheme] ?? THEME_BG.dark;

    // ── Build overlay ──
    const overlay = document.createElement('div');
    overlay.id = 'theme-sweep-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '999999',
      pointerEvents: 'none',
      backgroundColor: sweepColor,
      opacity: '1',
      willChange: 'clip-path, opacity',
      // Start from a zero-size quad at the appropriate corner
      // MUST use 4 vertices to match the target polygon (CSS can only
      // interpolate clip-path when vertex counts are equal).
      clipPath:
        nextTheme === 'dark'
          ? 'polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)'   // top-right
          : 'polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)',   // bottom-left
    });

    document.body.appendChild(overlay);

    // Force reflow so the browser registers the initial clip-path
    void overlay.offsetHeight;

    // ── Phase 1: Expand diagonally to full coverage ──
    requestAnimationFrame(() => {
      Object.assign(overlay.style, {
        transition: `clip-path ${SWEEP_DURATION}ms cubic-bezier(0.65, 0, 0.35, 1)`,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      });
    });

    // Flip theme halfway through the sweep (overlay mostly covers the viewport)
    setTimeout(() => {
      setTheme(nextTheme);
    }, THEME_FLIP_AT);

    // ── Phase 2: Fade out to reveal the new theme ──
    const onExpanded = () => {
      overlay.removeEventListener('transitionend', onExpanded);

      Object.assign(overlay.style, {
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        opacity: '0',
      });

      const onFaded = () => {
        overlay.remove();
        resolve();
      };

      overlay.addEventListener('transitionend', onFaded, { once: true });
      // Safety fallback
      setTimeout(onFaded, FADE_DURATION + 100);
    };

    overlay.addEventListener('transitionend', onExpanded, { once: true });

    // Safety fallback if transitionend never fires
    setTimeout(() => {
      if (document.getElementById('theme-sweep-overlay')) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, FADE_DURATION + 50);
      }
    }, SWEEP_DURATION + 100);
  });
}

/** Total time to wait before allowing another toggle (debounce). */
export const TRANSITION_LOCK_MS = SWEEP_DURATION + FADE_DURATION + 100;
