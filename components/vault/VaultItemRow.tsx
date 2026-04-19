'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Copy, Globe, Trash2, KeyRound, FileText, Pencil } from 'lucide-react';
import { useVault } from '@/lib/vault/store';
import type { VaultItem } from '@/lib/vault/types';

export default function VaultItemRow({ item, index, onEdit }: { item: VaultItem; index: number; onEdit?: (item: VaultItem) => void }) {
  const { dispatch, copyToClipboard } = useVault();
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = item.type === 'password';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="group flex items-center gap-3 rounded-xl border border-[var(--vault-border)] bg-[var(--vault-glass)] p-3 transition-all hover:border-[var(--vault-gold)]/30 hover:bg-[var(--vault-glass-hover)]"
    >
      {/* Icon */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPassword ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]' : 'bg-purple-500/10 text-purple-400'}`}>
        {isPassword ? <KeyRound className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-semibold text-[var(--vault-text)]">{item.title}</h4>
          {item.siteUrl && (
            <span className="truncate text-[10px] text-[var(--vault-muted)]">{item.siteUrl}</span>
          )}
        </div>
        {isPassword ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[var(--vault-muted)]">{item.username}</span>
            <span className="text-[10px] text-[var(--vault-muted)]">•</span>
            <span className="font-mono text-xs text-[var(--vault-muted)]">
              {showPassword ? item.password : '••••••••'}
            </span>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
            >
              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        ) : (
          <p className="truncate text-xs text-[var(--vault-muted)]">{item.plainText}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isPassword && (
          <>
            <button
              onClick={() => copyToClipboard(item.username || '', 'Username copied!')}
              className="vault-icon-btn"
              title="Copy username"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => copyToClipboard(item.password || '', 'Password copied!')}
              className="vault-icon-btn text-[var(--vault-gold)]"
              title="Copy password"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {!isPassword && (
          <button
            onClick={() => copyToClipboard(item.plainText)}
            className="vault-icon-btn"
            title="Copy content"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', id: item.id })}
          className="vault-icon-btn text-emerald-400"
          title="Make public"
        >
          <Globe className="h-3.5 w-3.5" />
        </button>
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="vault-icon-btn text-[var(--vault-gold)]"
            title="Edit item"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}
          className="vault-icon-btn text-red-400"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
