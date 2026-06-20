'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import type { CodeBlockContent } from '@/lib/vault/types';

const LANGUAGES = [
  'text', 'javascript', 'typescript', 'python', 'html', 'css', 'json',
  'sql', 'bash', 'go', 'rust', 'java', 'c', 'cpp', 'ruby', 'php', 'yaml', 'markdown',
];

interface CodeBlockProps {
  content: CodeBlockContent;
  onChange: (content: CodeBlockContent) => void;
}

export default function CodeBlock({ content, onChange }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [content.code]);

  return (
    <div className="rounded-xl border border-[var(--vault-border)] overflow-hidden bg-[#0d0d0d]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[var(--vault-border)] px-3 py-1.5 bg-[#141414]">
        <select
          value={content.language}
          onChange={(e) => onChange({ ...content, language: e.target.value })}
          className="bg-transparent text-[10px] font-medium text-[var(--vault-muted)] focus:outline-none cursor-pointer uppercase tracking-wider"
        >
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang} className="bg-[#141414] text-[var(--vault-text)]">
              {lang}
            </option>
          ))}
        </select>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
        >
          {copied ? (
            <><Check className="h-3 w-3 text-[#22C55E]" /> Copied</>
          ) : (
            <><Copy className="h-3 w-3" /> Copy</>
          )}
        </button>
      </div>

      {/* Code editor */}
      <textarea
        value={content.code}
        onChange={(e) => onChange({ ...content, code: e.target.value })}
        placeholder="// Paste or type code..."
        spellCheck={false}
        className="w-full min-h-[80px] bg-transparent px-4 py-3 text-xs text-[var(--vault-text)] focus:outline-none font-mono leading-relaxed resize-none placeholder:text-[var(--vault-muted)]/40"
      />
    </div>
  );
}
