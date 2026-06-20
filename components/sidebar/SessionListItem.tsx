'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, Globe, Pin, MoreHorizontal, Trash2, Copy, Edit2, ChevronRight } from 'lucide-react';
import type { Session } from '@/lib/vault/types';

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onTogglePin: () => void;
  onRename: (newTitle: string) => void;
  hasChildren?: boolean;
  depth?: number;
}

export default function SessionListItem({
  session,
  isActive,
  isCollapsed,
  onClick,
  onDelete,
  onDuplicate,
  onTogglePin,
  onRename,
  hasChildren = false,
  depth = 0,
}: SessionListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRename = useCallback(() => {
    if (renameValue.trim() && renameValue !== session.title) {
      onRename(renameValue.trim());
    } else {
      setRenameValue(session.title);
    }
    setIsRenaming(false);
  }, [renameValue, session.title, onRename]);

  if (isCollapsed) {
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-center justify-center rounded-lg py-2 transition-all ${
          isActive
            ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
            : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]'
        }`}
        title={session.title}
      >
        <span className="text-base">{session.emoji}</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="relative group"
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
    >
      <button
        onClick={onClick}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        className={`flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-sm transition-all relative ${
          isActive
            ? 'bg-[#1a1a1a] text-[var(--vault-gold)]'
            : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]'
        }`}
      >
        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="active-session-indicator"
            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-[var(--vault-gold)]"
          />
        )}

        {/* Expand arrow for children */}
        {hasChildren && (
          <ChevronRight className="h-3 w-3 text-[var(--vault-muted)] shrink-0" />
        )}

        <span className="text-base shrink-0">{session.emoji}</span>

        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setRenameValue(session.title); setIsRenaming(false); }
            }}
            className="flex-1 bg-transparent text-xs focus:outline-none min-w-0"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-xs truncate text-left">{session.title}</span>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {session.isPinned && <Pin className="h-3 w-3 text-[var(--vault-gold)]" />}
          {session.isEncrypted && <Lock className="h-3 w-3 text-[var(--vault-muted)]" />}
          {session.isPublic && <Globe className="h-3 w-3 text-[var(--vault-muted)]" />}
        </div>

        {/* Menu trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-all"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </button>

      {/* Context menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-[var(--vault-border)] bg-[#141414] shadow-xl py-1"
          >
            <button
              onClick={() => { setIsRenaming(true); setShowMenu(false); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]"
            >
              <Edit2 className="h-3.5 w-3.5" /> Rename
            </button>
            <button
              onClick={() => { onDuplicate(); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button
              onClick={() => { onTogglePin(); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]"
            >
              <Pin className="h-3.5 w-3.5" /> {session.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <div className="my-1 border-t border-[var(--vault-border)]" />
            <button
              onClick={() => { onDelete(); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Move to Trash
            </button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
