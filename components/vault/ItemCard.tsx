'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Edit3, Lock, FileText, Clipboard, KeyRound, Check, ArrowUpRight, Sparkles } from 'lucide-react';
import { useVault } from '@/lib/vault/store';
import type { VaultItem } from '@/lib/vault/types';

const typeIcons = {
  password: KeyRound,
  note: FileText,
  clipboard: Clipboard,
};

const typeColors = {
  password: '#c9a84c',
  note: '#8b5cf6',
  clipboard: '#06b6d4',
};

const typeGradients = {
  password: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))',
  note: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))',
  clipboard: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(6,182,212,0.02))',
};

interface Props {
  item: VaultItem;
  index: number;
  onClick?: () => void;
  onStatsClick?: () => void;
}

export default function ItemCard({ item, index, onClick, onStatsClick }: Props) {
  const { dispatch, copyToClipboard, currentDbUserId } = useVault();
  const [copied, setCopied] = useState(false);
  const Icon = typeIcons[item.type];
  const isClipboard = item.type === 'clipboard';
  const isOwner = currentDbUserId !== null && item.userId === currentDbUserId;

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(item.plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="vault-glass-card group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--vault-border)] transition-shadow hover:shadow-lg hover:shadow-[var(--vault-gold)]/5 hover:border-[var(--vault-gold)]/30"
      style={{ background: typeGradients[item.type] }}
    >
      {/* Hover glow effect for clipboard cards */}
      {isClipboard && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${typeColors.clipboard}15, transparent 70%)`,
          }}
        />
      )}

      {/* Click-to-open indicator */}
      <motion.div
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-all duration-200 group-hover:opacity-100"
        style={{ backgroundColor: `${typeColors[item.type]}15`, color: typeColors[item.type] }}
      >
        <ArrowUpRight className="h-3 w-3" />
      </motion.div>

      {/* Header */}
      <div className="flex items-start gap-2.5 p-4 pb-2">
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${typeColors[item.type]}15`, color: typeColors[item.type] }}
        >
          <Icon className="h-4 w-4" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--vault-text)]">{item.title}</h3>
          <p className="text-[10px] text-[var(--vault-muted)]">
            {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Content Preview */}
      <div className="flex-1 px-4 pb-2">
        <div
          className="vault-content-preview text-xs text-[var(--vault-muted)] line-clamp-3"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {item.tags.map(tag => (
            <span
              key={tag.id}
              className="rounded-md px-1.5 py-px text-[10px] font-medium"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div
        className="flex items-center gap-1 border-t border-[var(--vault-border)] px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.button
          whileTap={{ scale: 1.1 }}
          onClick={handleQuickCopy}
          className={`vault-action-btn transition-all ${copied ? 'text-emerald-400' : ''}`}
          title="Copy content"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </motion.button>
        <button className="vault-action-btn" title="Edit item">
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit</span>
        </button>
        {isClipboard && onStatsClick && (
          <button 
            className="vault-action-btn" 
            title="View stats"
            onClick={(e) => {
              e.stopPropagation();
              onStatsClick();
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Stats</span>
          </button>
        )}
        {isOwner && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', id: item.id })}
            className="vault-action-btn ml-auto"
            title="Make Private"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Private</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
