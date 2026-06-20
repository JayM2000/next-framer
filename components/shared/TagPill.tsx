'use client';

import type { Tag } from '@/lib/vault/types';

interface TagPillProps {
  tag: Tag;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export default function TagPill({ tag, onRemove, size = 'sm' }: TagPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[var(--vault-border)] bg-[var(--vault-panel)] transition-all hover:border-opacity-60 ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: tag.color }}
      />
      <span className="text-[var(--vault-text)] font-medium">{tag.label}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
        >
          ×
        </button>
      )}
    </span>
  );
}
