'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Shield, Lock } from 'lucide-react';
import type { SessionWithBlocks, PresenceEntry } from '@/lib/vault/types';
import TagPill from '@/components/shared/TagPill';
import PresenceBar from './PresenceBar';
import BreadcrumbNav from './BreadcrumbNav';
import { trpc } from '@/trpc/client';

interface CanvasHeaderProps {
  session: SessionWithBlocks;
  viewers: PresenceEntry[];
  currentUserId?: string | null;
  onNavigateHome: () => void;
}

export default function CanvasHeader({ session, viewers, currentUserId, onNavigateHome }: CanvasHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(session.title);
  const titleRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const updateSession = trpc.sessions.updateSession.useMutation({
    onSuccess: () => utils.sessions.getSessions.invalidate(),
  });

  const updateTags = trpc.sessions.updateSessionTags.useMutation({
    onSuccess: () => {
      utils.sessions.getSession.invalidate({ id: session.id });
      utils.sessions.getSessions.invalidate();
    },
  });

  const handleTitleSave = useCallback(() => {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue !== session.title) {
      updateSession.mutate({ id: session.id, title: titleValue.trim() });
    } else {
      setTitleValue(session.title);
    }
  }, [titleValue, session.id, session.title, updateSession]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitleValue(session.title);
      setIsEditingTitle(false);
    }
  }, [handleTitleSave, session.title]);

  const handleEmojiClick = useCallback(() => {
    // Simple emoji rotation for now — full picker will be added later
    const emojis = ['📄', '📝', '🔑', '📎', '🗂️', '💡', '⭐', '🎯', '📊', '🔒'];
    const currentIdx = emojis.indexOf(session.emoji);
    const nextEmoji = emojis[(currentIdx + 1) % emojis.length];
    updateSession.mutate({ id: session.id, emoji: nextEmoji });
  }, [session.id, session.emoji, updateSession]);

  const handleRemoveTag = useCallback((tagId: string) => {
    const newTags = session.tags.filter(t => t.id !== tagId);
    updateTags.mutate({
      sessionId: session.id,
      tags: newTags.map(t => ({ label: t.label, color: t.color })),
    });
  }, [session.id, session.tags, updateTags]);

  // Relative time formatting
  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="mb-6"
    >
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: 'Dashboard', onClick: onNavigateHome },
          ...(session.parentId ? [{ label: '...' }] : []),
          { label: session.title },
        ]}
      />

      {/* Emoji + Title */}
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={handleEmojiClick}
          className="text-3xl hover:scale-110 transition-transform cursor-pointer mt-0.5 shrink-0"
          title="Change emoji"
        >
          {session.emoji}
        </button>

        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              ref={titleRef}
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="session-title w-full"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => { setIsEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 0); }}
              className="session-title cursor-text truncate"
            >
              {session.title}
            </h1>
          )}
        </div>

        {/* Status icons */}
        <div className="flex items-center gap-2 shrink-0 mt-2">
          {session.isPublic ? (
            <Globe className="h-4 w-4 text-[var(--vault-muted)]" />
          ) : (
            <Lock className="h-4 w-4 text-[var(--vault-muted)]" />
          )}
          {session.isEncrypted && (
            <Shield className="h-4 w-4 text-[var(--vault-gold)]" />
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {session.tags.map(tag => (
          <TagPill key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag.id)} />
        ))}
        <button
          onClick={() => {
            // TODO: Open tag input/autocomplete
          }}
          className="text-[10px] text-[var(--vault-muted)] hover:text-[var(--vault-gold)] transition-colors px-2 py-0.5 rounded-full border border-dashed border-[var(--vault-border)] hover:border-[var(--vault-gold)]/30"
        >
          + Add tag
        </button>
      </div>

      {/* Presence bar */}
      <div className="flex items-center justify-between">
        <PresenceBar viewers={viewers} currentUserId={currentUserId} />
        <span className="text-[10px] text-[var(--vault-muted)]">
          Edited {getRelativeTime(session.updatedAt)}
        </span>
      </div>

      {/* Separator */}
      <div className="mt-4 border-t border-[var(--vault-border)]" />
    </motion.div>
  );
}
