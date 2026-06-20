'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Copy, ExternalLink, KeyRound } from 'lucide-react';
import type { PasswordBlockContent } from '@/lib/vault/types';

interface PasswordBlockProps {
  content: PasswordBlockContent;
  onChange: (content: PasswordBlockContent) => void;
}

export default function PasswordBlock({ content, onChange }: PasswordBlockProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  }, []);

  // Auto-hide password after 10 seconds
  const togglePassword = useCallback(() => {
    if (!showPassword) {
      setShowPassword(true);
      setTimeout(() => setShowPassword(false), 10_000);
    } else {
      setShowPassword(false);
    }
  }, [showPassword]);

  return (
    <div className="rounded-xl border border-[var(--vault-border)] bg-gradient-to-b from-[#1a1a1a] to-[#141414] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--vault-gold)]/10">
          <KeyRound className="h-4 w-4 text-[var(--vault-gold)]" />
        </div>
        <input
          type="text"
          value={content.label}
          onChange={(e) => onChange({ ...content, label: e.target.value })}
          placeholder="Label (e.g. Gmail)"
          className="flex-1 bg-transparent text-sm font-semibold text-[var(--vault-text)] focus:outline-none placeholder:text-[var(--vault-muted)]"
        />
      </div>

      {/* Username */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--vault-border)] bg-[#0d0d0d] px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--vault-muted)] shrink-0 w-16">User</span>
        <input
          type="text"
          value={content.username}
          onChange={(e) => onChange({ ...content, username: e.target.value })}
          placeholder="username"
          className="flex-1 bg-transparent text-xs text-[var(--vault-text)] focus:outline-none font-mono"
        />
        <button
          onClick={() => handleCopy(content.username, 'username')}
          className="shrink-0 p-1 rounded text-[var(--vault-muted)] hover:text-[var(--vault-gold)] transition-colors"
        >
          <Copy className={`h-3.5 w-3.5 ${copied === 'username' ? 'text-[#22C55E]' : ''}`} />
        </button>
      </div>

      {/* Password */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--vault-border)] bg-[#0d0d0d] px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--vault-muted)] shrink-0 w-16">Pass</span>
        <input
          type={showPassword ? 'text' : 'password'}
          value={content.encryptedPassword}
          onChange={(e) => onChange({ ...content, encryptedPassword: e.target.value })}
          placeholder="••••••••"
          className="flex-1 bg-transparent text-xs text-[var(--vault-text)] focus:outline-none font-mono"
        />
        <button
          onClick={togglePassword}
          className="shrink-0 p-1 rounded text-[var(--vault-muted)] hover:text-[var(--vault-gold)] transition-colors"
        >
          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => handleCopy(content.encryptedPassword, 'password')}
          className="shrink-0 p-1 rounded text-[var(--vault-muted)] hover:text-[var(--vault-gold)] transition-colors"
        >
          <Copy className={`h-3.5 w-3.5 ${copied === 'password' ? 'text-[#22C55E]' : ''}`} />
        </button>
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--vault-border)] bg-[#0d0d0d] px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--vault-muted)] shrink-0 w-16">URL</span>
        <input
          type="url"
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          placeholder="https://..."
          className="flex-1 bg-transparent text-xs text-[var(--vault-text)] focus:outline-none font-mono"
        />
        {content.url && (
          <a
            href={content.url.startsWith('http') ? content.url : `https://${content.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1 rounded text-[var(--vault-muted)] hover:text-[var(--vault-gold)] transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Notes */}
      <textarea
        value={content.notes}
        onChange={(e) => onChange({ ...content, notes: e.target.value })}
        placeholder="Add notes..."
        rows={2}
        className="w-full rounded-lg border border-[var(--vault-border)] bg-[#0d0d0d] px-3 py-2 text-xs text-[var(--vault-text)] focus:outline-none placeholder:text-[var(--vault-muted)] resize-none"
      />
    </div>
  );
}
