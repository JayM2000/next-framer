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

  return new Promise<void>((resolve) => {
    const sweepColor = THEME_BG[nextTheme] ?? THEME_BG.dark;

    // ── Build overlay ──
    const overlay = document.createElement('div');
    overlay.id = 'theme-sweep-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const initialClipPath = nextTheme === 'dark'
      ? 'circle(0% at 100% 0%)'   // top-right
      : 'circle(0% at 0% 100%)';  // bottom-left

    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '999999',
      pointerEvents: 'none',
      backgroundColor: sweepColor,
      opacity: '1',
      willChange: 'clip-path, -webkit-clip-path, opacity',
      clipPath: initialClipPath,
      WebkitClipPath: initialClipPath,
    });

    document.body.appendChild(overlay);

    // Force reflow so the browser registers the initial clip-path
    void overlay.offsetHeight;

    // ── Phase 1: Expand circularly to full coverage ──
    requestAnimationFrame(() => {
      // Use setTimeout as a microtask fallback to ensure the reflow is painted
      setTimeout(() => {
        const finalClipPath = nextTheme === 'dark'
          ? 'circle(150% at 100% 0%)'
          : 'circle(150% at 0% 100%)';
          
        Object.assign(overlay.style, {
          transition: `clip-path ${SWEEP_DURATION}ms cubic-bezier(0.65, 0, 0.35, 1), -webkit-clip-path ${SWEEP_DURATION}ms cubic-bezier(0.65, 0, 0.35, 1)`,
          clipPath: finalClipPath,
          WebkitClipPath: finalClipPath,
        });
      }, 10);
    });

    // Flip theme halfway through the sweep (overlay mostly covers the viewport)
    setTimeout(() => {
      setTheme(nextTheme);
    }, THEME_FLIP_AT);

    // ── Phase 2: Fade out to reveal the new theme ──
    const onExpanded = (e: TransitionEvent) => {
      // Only trigger on the clip-path transition, not opacity or others
      if (e.propertyName !== 'clip-path' && e.propertyName !== '-webkit-clip-path') return;
      overlay.removeEventListener('transitionend', onExpanded as EventListener);

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
