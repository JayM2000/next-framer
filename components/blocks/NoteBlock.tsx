'use client';

import type { NoteBlockContent } from '@/lib/vault/types';

interface NoteBlockProps {
  content: NoteBlockContent;
  onChange: (content: NoteBlockContent) => void;
}

const NOTE_COLORS = [
  { value: '#D4A827', label: 'Gold' },
  { value: '#6366F1', label: 'Purple' },
  { value: '#22C55E', label: 'Green' },
  { value: '#FF6B2B', label: 'Orange' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#EF4444', label: 'Red' },
];

export default function NoteBlock({ content, onChange }: NoteBlockProps) {
  const color = content.color || '#D4A827';

  return (
    <div
      className="rounded-xl border p-4 space-y-2 transition-colors"
      style={{
        borderColor: `${color}30`,
        backgroundColor: `${color}08`,
      }}
    >
      {/* Title */}
      <input
        type="text"
        value={content.title}
        onChange={(e) => onChange({ ...content, title: e.target.value })}
        placeholder="Note title..."
        className="w-full bg-transparent text-sm font-semibold focus:outline-none placeholder:text-[var(--vault-muted)]"
        style={{ color }}
      />

      {/* Body */}
      <textarea
        value={content.body}
        onChange={(e) => onChange({ ...content, body: e.target.value })}
        placeholder="Write your note..."
        rows={3}
        className="w-full bg-transparent text-xs text-[var(--vault-text)] focus:outline-none placeholder:text-[var(--vault-muted)] resize-none leading-relaxed"
      />

      {/* Color picker */}
      <div className="flex items-center gap-1.5 pt-1">
        {NOTE_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => onChange({ ...content, color: c.value })}
            className={`h-4 w-4 rounded-full transition-all hover:scale-125 ${
              color === c.value ? 'ring-2 ring-offset-1 ring-offset-[#0d0d0d]' : ''
            }`}
            style={{ backgroundColor: c.value }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
}
