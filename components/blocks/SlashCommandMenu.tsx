'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { BlockType } from '@/lib/vault/types';

interface SlashMenuItem {
  label: string;
  description: string;
  icon: string;
  type: BlockType;
}

interface SlashCommandMenuProps {
  isOpen: boolean;
  items: SlashMenuItem[];
  selectedIndex: number;
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export default function SlashCommandMenu({
  isOpen,
  items,
  selectedIndex,
  onSelect,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onClose: _onClose,
  position,
}: SlashCommandMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed z-[100] w-64 rounded-xl border border-[var(--vault-border)] bg-[#141414] shadow-2xl shadow-black/40 py-1 overflow-hidden"
          style={position ? { top: position.top, left: position.left } : undefined}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-[var(--vault-border)]">
            <p className="text-[10px] font-medium text-[var(--vault-muted)] uppercase tracking-wider">
              Add a block
            </p>
          </div>

          {/* Items */}
          <div className="max-h-64 overflow-y-auto py-1">
            {items.map((item, i) => (
              <button
                key={`${item.type}-${item.label}`}
                onClick={() => onSelect(item)}
                onMouseEnter={() => {}} // handled by parent
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                    : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--vault-panel)] border border-[var(--vault-border)] text-base shrink-0">
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.label}</p>
                  <p className="text-[10px] text-[var(--vault-muted)] truncate">{item.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-[var(--vault-border)]">
            <p className="text-[9px] text-[var(--vault-muted)]">
              ↑↓ Navigate • Enter Select • Esc Close
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
