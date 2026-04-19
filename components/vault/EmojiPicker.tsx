'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EMOJI_CATEGORIES = [
  {
    label: 'Smileys',
    emojis: ['😊', '😂', '🥰', '😎', '🤔', '😢', '😡', '🥳', '😴', '🤯'],
  },
  {
    label: 'Hands',
    emojis: ['👍', '👎', '👋', '🙏', '💪', '🤝', '✌️', '🤞', '👏', '🫡'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💖'],
  },
  {
    label: 'Nature',
    emojis: ['⭐', '🌟', '✨', '💫', '🔥', '💥', '⚡', '🌈', '☀️', '🌙'],
  },
  {
    label: 'Dev',
    emojis: ['🚀', '✅', '❌', '⚠️', '💡', '🐛', '🎯', '📦', '🔐', '🔑'],
  },
  {
    label: 'Tools',
    emojis: ['🌐', '💻', '🧪', '🛠️', '📝', '🎨', '♻️', '🗑️', '📌', '🔖'],
  },
  {
    label: 'Files',
    emojis: ['📋', '📊', '📈', '📉', '🗂️', '📁', '🏷️', '🔍', '🔗', '💾'],
  },
  {
    label: 'Fun',
    emojis: ['🎉', '🎊', '🎁', '🏆', '🥇', '🎵', '🎶', '☕', '🍕', '🍝'],
  },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export default function EmojiPicker({ onSelect, onClose, anchorRef }: Props) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  // Calculate position from anchor
  useEffect(() => {
    setMounted(true);

    const updatePosition = () => {
      if (anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const pickerWidth = 296;
        const pickerHeight = 340;

        // Position above the anchor by default
        let top = rect.top - pickerHeight - 8;
        let left = rect.left;

        // If it would go off-screen top, position below
        if (top < 8) {
          top = rect.bottom + 8;
        }

        // If it would go off-screen right, shift left
        if (left + pickerWidth > window.innerWidth - 8) {
          left = window.innerWidth - pickerWidth - 8;
        }

        // If it would go off-screen left
        if (left < 8) {
          left = 8;
        }

        setPosition({ top, left });
      } else {
        // Fallback: center on screen
        setPosition({
          top: Math.max(8, (window.innerHeight - 340) / 2),
          left: Math.max(8, (window.innerWidth - 296) / 2),
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [anchorRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        !(anchorRef?.current?.contains(e.target as Node))
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!mounted) return null;

  const picker = (
    <div
      ref={pickerRef}
      className="fixed z-[100] w-[296px] rounded-xl border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
        animation: 'emoji-pop 0.15s ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--vault-border)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--vault-text)]">Emoji</span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded-md text-xs text-[var(--vault-muted)] hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scrollable emoji grid */}
      <div className="max-h-[260px] overflow-y-auto overscroll-contain p-2 space-y-2">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">
              {cat.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-[var(--vault-glass-hover)] active:scale-90 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes emoji-pop {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />
    </div>
  );

  return createPortal(picker, document.body);
}
