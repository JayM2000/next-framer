'use client';

import { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import type { LinkBlockContent } from '@/lib/vault/types';

interface LinkBlockProps {
  content: LinkBlockContent;
  onChange: (content: LinkBlockContent) => void;
}

export default function LinkBlock({ content, onChange }: LinkBlockProps) {
  const [isEditing, setIsEditing] = useState(!content.url);

  if (isEditing || !content.url) {
    return (
      <div className="rounded-xl border border-[var(--vault-border)] bg-[#141414] p-4">
        <input
          type="url"
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && content.url) {
              setIsEditing(false);
              // Auto-fill title from URL
              try {
                const url = new URL(content.url.startsWith('http') ? content.url : `https://${content.url}`);
                if (!content.title) {
                  onChange({ ...content, url: url.href, title: url.hostname.replace('www.', '') });
                }
              } catch { /* ignore */ }
            }
          }}
          placeholder="Paste a URL and press Enter..."
          className="w-full bg-transparent text-sm text-[var(--vault-text)] focus:outline-none placeholder:text-[var(--vault-muted)]"
          autoFocus
        />
      </div>
    );
  }

  const hostname = (() => {
    try { return new URL(content.url).hostname.replace('www.', ''); } catch { return content.url; }
  })();

  return (
    <a
      href={content.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-[var(--vault-border)] bg-[#141414] p-4 hover:border-[var(--vault-gold)]/30 transition-all group/link"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return; // Allow cmd/ctrl+click
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--vault-gold)]/10">
          <Globe className="h-5 w-5 text-[var(--vault-gold)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--vault-text)] truncate group-hover/link:text-[var(--vault-gold)] transition-colors">
              {content.title || hostname}
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--vault-muted)] group-hover/link:text-[var(--vault-gold)]" />
          </div>
          {content.description && (
            <p className="text-xs text-[var(--vault-muted)] mt-0.5 line-clamp-2">{content.description}</p>
          )}
          <span className="text-[10px] text-[var(--vault-muted)] mt-1 block truncate">{hostname}</span>
        </div>
      </div>
    </a>
  );
}
