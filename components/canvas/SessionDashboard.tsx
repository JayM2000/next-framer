'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { trpc } from '@/trpc/client';
import { Loader2 } from 'lucide-react';
import InfiniteCanvas from './InfiniteCanvas';
import type { Session } from '@/lib/vault/types';

interface SessionDashboardProps {
  onOpenSession: (sessionId: string) => void;
}

export default function SessionDashboard({ onOpenSession }: SessionDashboardProps) {
  // Fetch all sessions for the canvas
  const { data: sessions = [], isLoading } = trpc.sessions.getSessions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Fetch block data to determine which sessions have password blocks
  // and to get preview text
  const { data: dashboard } = trpc.sessions.getDashboardData.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Build preview map from dashboard data
  const previewMap = useMemo(() => {
    const map = new Map<string, string>();
    if (dashboard) {
      for (const s of [...dashboard.recentlyVisited, ...dashboard.trending, ...dashboard.pinned]) {
        if (s.preview && !map.has(s.id)) {
          map.set(s.id, s.preview);
        }
      }
    }
    return map;
  }, [dashboard]);

  // Enrich sessions with preview data
  const enrichedSessions = useMemo(() => {
    return sessions.map((session: Session) => ({
      ...session,
      preview: previewMap.get(session.id) || '',
      hasPasswords: false, // Could be enriched with block-type counts if desired
    }));
  }, [sessions, previewMap]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-6 w-6 animate-spin text-[var(--vault-gold)]" />
          <p className="text-xs text-[var(--vault-muted)]">Loading canvas…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col min-h-0"
    >
      <InfiniteCanvas
        sessions={enrichedSessions}
        activeSessionId={null}
        onOpenSession={onOpenSession}
      />
    </motion.div>
  );
}
