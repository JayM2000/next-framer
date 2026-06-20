'use client';

import type { DividerBlockContent } from '@/lib/vault/types';

interface DividerBlockProps {
  content: DividerBlockContent;
  onChange: (content: DividerBlockContent) => void;
}

export default function DividerBlock({ content, onChange }: DividerBlockProps) {
  const style = content.style || 'solid';

  return (
    <div className="py-2 group/div">
      {style === 'gradient' ? (
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--vault-gold)]/40 to-transparent" />
      ) : (
        <div
          className="h-px bg-[var(--vault-border)]"
          style={{
            borderTop: style === 'dashed' ? '1px dashed var(--vault-border)' : undefined,
            backgroundColor: style === 'dashed' ? 'transparent' : undefined,
          }}
        />
      )}

      {/* Style switcher (hover) */}
      <div className="flex items-center justify-center gap-2 mt-1 opacity-0 group-hover/div:opacity-100 transition-opacity">
        {(['solid', 'dashed', 'gradient'] as const).map((s) => (
          <button
            key={s}
            onClick={() => onChange({ style: s })}
            className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
              style === s
                ? 'border-[var(--vault-gold)]/40 text-[var(--vault-gold)] bg-[var(--vault-gold)]/10'
                : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:text-[var(--vault-text)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
