'use client';

import { useState } from 'react';
import { generatePassword, type PasswordOptions } from '@/lib/vault/passwordUtils';
import PasswordStrength from './PasswordStrength';
import { RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useVault } from '@/lib/vault/store';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function PasswordGenerator({ value, onChange }: Props) {
  const { copyToClipboard } = useVault();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const handleGenerate = () => {
    const pw = generatePassword(options);
    onChange(pw);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--vault-gold)] hover:text-[var(--vault-gold-light)] transition-colors"
        >
          Generate Password {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => copyToClipboard(value)}
            className="flex items-center gap-1 text-xs text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        )}
      </div>

      <PasswordStrength password={value} />

      {open && (
        <div className="space-y-3 rounded-lg border border-[var(--vault-border)] bg-[var(--vault-glass)] p-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--vault-muted)]">Length</span>
              <span className="font-mono text-[var(--vault-gold)]">{options.length}</span>
            </div>
            <input
              type="range"
              min={8}
              max={32}
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: Number(e.target.value) })}
              className="vault-range w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['uppercase', 'lowercase', 'numbers', 'symbols'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-xs text-[var(--vault-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                  className="vault-checkbox"
                />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--vault-gold)] px-3 py-1.5 text-xs font-semibold text-[#0a0a0f] transition-all hover:bg-[var(--vault-gold-light)]"
          >
            <RefreshCw className="h-3 w-3" /> Generate
          </button>
        </div>
      )}
    </div>
  );
}
