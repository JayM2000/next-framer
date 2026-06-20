'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PresenceEntry } from '@/lib/vault/types';

export function usePresence(sessionId: string | null) {
  const [viewers, setViewers] = useState<PresenceEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const heartbeat = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEditing }),
      });
      const data = await res.json();
      setViewers(data.viewers || []);
    } catch {
      // Silently fail — presence is not critical
    }
  }, [sessionId, isEditing]);

  useEffect(() => {
    if (!sessionId) {
      setViewers([]);
      return;
    }

    // Immediate heartbeat on mount
    heartbeat();

    // Heartbeat every 30 seconds
    intervalRef.current = setInterval(heartbeat, 30_000);

    // Cleanup on unmount — send leave signal
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      // Send leave signal (keepalive for page close)
      fetch(`/api/sessions/${sessionId}/presence`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    };
  }, [sessionId, heartbeat]);

  const setEditing = useCallback((editing: boolean) => {
    setIsEditing(editing);
  }, []);

  return { viewers, setEditing };
}
