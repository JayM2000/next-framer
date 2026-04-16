'use client';

import { useState, useRef, type KeyboardEvent } from 'react';
import type { Tag } from '@/lib/vault/types';
import { X } from 'lucide-react';

const TAG_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#10b981'];

interface Props {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagInput({ tags, onChange }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const label = value.trim();
    if (!label || tags.some(t => t.label.toLowerCase() === label.toLowerCase())) return;
    const color = TAG_COLORS[tags.length % TAG_COLORS.length];
    onChange([...tags, { id: crypto.randomUUID(), label, color }]);
    setValue('');
  };

  const removeTag = (id: string) => {
    onChange(tags.filter(t => t.id !== id));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !value && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--vault-border)] bg-[var(--vault-glass)] px-2 py-1.5 focus-within:border-[var(--vault-gold)] focus-within:ring-1 focus-within:ring-[var(--vault-gold)] transition-colors cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: tag.color + '30', color: tag.color, border: `1px solid ${tag.color}40` }}
        >
          {tag.label}
          <button type="button" onClick={() => removeTag(tag.id)} className="hover:opacity-70 transition-opacity">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        placeholder={tags.length === 0 ? "Add tags..." : ""}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        className="min-w-[60px] flex-1 bg-transparent text-xs text-[var(--vault-text)] placeholder:text-[var(--vault-muted)] outline-none"
      />
    </div>
  );
}
