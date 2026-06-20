'use client';

import { Search, X } from 'lucide-react';
import { useState, useRef } from 'react';

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  isCollapsed: boolean;
}

export default function SidebarSearch({ value, onChange, isCollapsed }: SidebarSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isCollapsed) {
    return (
      <button
        onClick={() => {}}
        className="flex w-full items-center justify-center rounded-lg py-2 text-[var(--vault-muted)] hover:text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-all"
        title="Search sessions"
      >
        <Search className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all ${
        isFocused
          ? 'border-[var(--vault-gold)]/40 bg-[var(--vault-gold)]/5'
          : 'border-[var(--vault-border)] bg-[var(--vault-panel)]'
      }`}
    >
      <Search className={`h-3.5 w-3.5 shrink-0 ${isFocused ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Search sessions..."
        className="flex-1 bg-transparent text-xs text-[var(--vault-text)] focus:outline-none placeholder:text-[var(--vault-muted)]"
      />
      {value && (
        <button
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
