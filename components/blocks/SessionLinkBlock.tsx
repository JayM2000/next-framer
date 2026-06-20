'use client';

import { FileText } from 'lucide-react';
import type { SessionEmbedBlockContent } from '@/lib/vault/types';

interface SessionLinkBlockProps {
  content: SessionEmbedBlockContent;
  onNavigate: (sessionId: string) => void;
}

export default function SessionLinkBlock({ content, onNavigate }: SessionLinkBlockProps) {
  if (!content.targetSessionId) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--vault-border)] bg-[#141414] p-4 text-center">
        <p className="text-xs text-[var(--vault-muted)]">Session link — target not found</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => onNavigate(content.targetSessionId)}
      className="w-full text-left rounded-xl border border-[var(--vault-border)] bg-[#141414] p-4 hover:border-[var(--vault-gold)]/30 hover:bg-[#1a1a1a] transition-all group/session-link cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--vault-gold)]/10">
          <FileText className="h-4 w-4 text-[var(--vault-gold)]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--vault-text)] group-hover/session-link:text-[var(--vault-gold)] transition-colors truncate block">
            {content.targetTitle || 'Untitled Session'}
          </span>
          {content.preview && (
            <span className="text-xs text-[var(--vault-muted)] mt-0.5 line-clamp-1 block">{content.preview}</span>
          )}
        </div>
        <span className="text-[10px] text-[var(--vault-muted)] shrink-0">→</span>
      </div>
    </button>
  );
}
