'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useSessionNavigation() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateTo = useCallback(async (sessionId: string) => {
    setIsNavigating(true);
    // Allow Framer Motion exit animation to complete (~150ms)
    await new Promise(r => setTimeout(r, 150));
    router.push(`/session/${sessionId}`, { scroll: false });
    setIsNavigating(false);
  }, [router]);

  return { navigateTo, isNavigating };
}
