'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { GripVertical, Plus, MoreHorizontal, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';

interface BlockWrapperProps {
  children: ReactNode;
  blockId: string;
  onAddBelow: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export default function BlockWrapper({
  children,
  blockId,
  onAddBelow,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isDragging = false,
  dragHandleProps,
}: BlockWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
      data-block-id={blockId}
    >
      {/* Left column: drag handle + add below */}
      <div
        className={`absolute -left-10 top-0 bottom-0 flex flex-col items-center gap-0.5 pt-1 transition-opacity duration-150 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Drag handle */}
        <button
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-0.5 rounded text-[var(--vault-muted)] hover:text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-all"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Add below */}
        <button
          onClick={onAddBelow}
          className="p-0.5 rounded text-[var(--vault-muted)] hover:text-[var(--vault-gold)] hover:bg-[var(--vault-gold)]/10 transition-all"
          title="Add block below"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Block content */}
      <div
        className={`relative rounded-lg transition-colors duration-150 ${
          isHovered ? 'bg-[#141414]' : ''
        }`}
      >
        {children}
      </div>

      {/* Right column: menu */}
      <div
        className={`absolute -right-9 top-0 transition-opacity duration-150 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded text-[var(--vault-muted)] hover:text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-all"
          title="Block menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {/* Block context menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-xl py-1"
            >
              {onMoveUp && (
                <button
                  onClick={() => { onMoveUp(); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Move Up
                </button>
              )}
              {onMoveDown && (
                <button
                  onClick={() => { onMoveDown(); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Move Down
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={() => { onDuplicate(); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
              )}
              <div className="my-1 border-t border-[var(--vault-border)]" />
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
