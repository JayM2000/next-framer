'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Copy, Globe, Trash2, KeyRound,
  FileText, Pencil, Clipboard, Check, Shield, ExternalLink, ArrowUpRight, RotateCcw, Link2
} from 'lucide-react';
import { useVault } from '@/lib/vault/store';
import type { VaultItem } from '@/lib/vault/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/* ─── Colour palette per type (distinct from public cards) ─── */
const palette = {
  password: {
    accent: '#e0a526',
    bg: 'linear-gradient(160deg, rgba(224,165,38,0.07) 0%, rgba(224,165,38,0.01) 100%)',
    iconBg: 'rgba(224,165,38,0.12)',
    ring: 'rgba(224,165,38,0.25)',
  },
  note: {
    accent: '#a78bfa',
    bg: 'linear-gradient(160deg, rgba(167,139,250,0.07) 0%, rgba(167,139,250,0.01) 100%)',
    iconBg: 'rgba(167,139,250,0.12)',
    ring: 'rgba(167,139,250,0.25)',
  },
  clipboard: {
    accent: '#38bdf8',
    bg: 'linear-gradient(160deg, rgba(56,189,248,0.07) 0%, rgba(56,189,248,0.01) 100%)',
    iconBg: 'rgba(56,189,248,0.12)',
    ring: 'rgba(56,189,248,0.25)',
  },
};

const typeIcons = { password: KeyRound, note: FileText, clipboard: Clipboard };

export default function VaultItemRow({
  item,
  index,
  onEdit,
  onClick,
}: {
  item: VaultItem;
  index: number;
  onEdit?: (item: VaultItem) => void;
  onClick?: () => void;
}) {
  const { dispatch, copyToClipboard } = useVault();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const p = palette[item.type];
  const Icon = typeIcons[item.type];
  const isPassword = item.type === 'password';

  const flash = (label: string) => {
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  };

  const handleCopyMain = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPassword) {
      copyToClipboard(item.password || '', 'Password copied!');
      flash('password');
    } else {
      copyToClipboard(item.plainText);
      flash('content');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="vault-private-card group relative cursor-pointer overflow-hidden rounded-xl border border-[var(--vault-border)] transition-all duration-200"
      style={{
        background: p.bg,
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* ─── Animated border fill — draws around the card on hover ─── */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full rounded-xl"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <rect
          x="0.5"
          y="0.5"
          width="calc(100% - 1px)"
          height="calc(100% - 1px)"
          rx="11"
          ry="11"
          fill="none"
          stroke={p.accent}
          strokeWidth="1.5"
          strokeDasharray="1000"
          strokeDashoffset="1000"
          className="transition-all duration-500 ease-out group-hover:[stroke-dashoffset:0]"
          style={{ opacity: 0.7 }}
        />
      </svg>

      {/* ─── Hover glow ─── */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          boxShadow: `0 4px 24px -4px ${p.ring}`,
        }}
      />

      {/* ─── Top accent line ─── */}
      <div
        className="absolute left-4 right-4 top-0 h-px opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)` }}
      />

      {/* ─── Click-to-open indicator ─── */}
      <motion.div
        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-all duration-200 group-hover:opacity-100"
        style={{ backgroundColor: `${p.accent}18`, color: p.accent }}
      >
        <ArrowUpRight className="h-3 w-3" />
      </motion.div>

      {/* ─── Header row ─── */}
      <div className="relative flex items-start gap-3 px-4 pt-3.5 pb-1.5">
        {/* Icon */}
        <motion.div
          whileHover={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.35 }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: p.iconBg, color: p.accent }}
        >
          <Icon className="h-4 w-4" />
        </motion.div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-[13px] font-semibold text-[var(--vault-text)] leading-tight">
              {item.title}
            </h4>
            {isPassword && item.siteUrl && (
              <a
                href={item.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex shrink-0 items-center gap-0.5 text-[9px] font-medium opacity-0 transition-all group-hover:opacity-80"
                style={{ color: p.accent }}
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--vault-muted)]">
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-[var(--vault-muted)] opacity-40" />
            <span className="inline-flex items-center gap-0.5 rounded-sm px-1 py-px text-[9px] font-medium"
              style={{ backgroundColor: p.iconBg, color: p.accent }}
            >
              <Shield className="h-2 w-2" />
              Private
            </span>
          </div>
        </div>
      </div>

      {/* ─── Content body ─── */}
      <div className="px-4 pb-1">
        {isPassword ? (
          <div className="flex items-center gap-2 rounded-lg p-2 mt-0.5"
            style={{ background: 'var(--vault-glass)' }}
          >
            <span className="truncate text-xs text-[var(--vault-muted)]">
              {item.username}
            </span>
            <span className="h-3 w-px bg-[var(--vault-border)] shrink-0" />
            <span className="flex-1 truncate font-mono text-xs text-[var(--vault-muted)]">
              {showPassword ? item.password : '••••••••••'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowPassword(!showPassword); }}
              className="shrink-0 rounded p-0.5 text-[var(--vault-muted)] transition-colors hover:text-[var(--vault-text)]"
            >
              {showPassword
                ? <EyeOff className="h-3 w-3" />
                : <Eye className="h-3 w-3" />}
            </button>
          </div>
        ) : (
          <div
            className="vault-content-preview text-xs text-[var(--vault-muted)] line-clamp-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        )}
      </div>

      {/* ─── Extracted URL Links ─── */}
      {item.extractedUrls && item.extractedUrls.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-1 pb-0.5" onClick={(e) => e.stopPropagation()}>
          {item.extractedUrls.map((link, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    borderColor: `${p.accent}25`,
                    background: `linear-gradient(135deg, ${p.accent}06, ${p.accent}12)`,
                    color: p.accent,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60 transition-opacity group-hover/link:opacity-100" />
                  <span className="max-w-[120px] truncate">{link.label}</span>
                </a>
              </TooltipTrigger>
              <TooltipContent
                className="max-w-[300px] break-all border-[var(--vault-border)] bg-[var(--vault-glass)] backdrop-blur-xl text-[var(--vault-text)] shadow-lg font-mono text-[10px]"
              >
                <p>{link.url}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* ─── Tags ─── */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pt-1 pb-0.5">
          {item.tags.map(tag => (
            <span
              key={tag.id}
              className="rounded-md px-1.5 py-px text-[9px] font-medium"
              style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* ─── Action bar ─── */}
      <div
        className="flex items-center gap-0.5 border-t border-[var(--vault-border)]/60 px-3 py-1.5 mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Quick copy */}
        <motion.button
          whileTap={{ scale: 1.1 }}
          onClick={handleCopyMain}
          className={`vault-action-btn transition-all ${copied ? 'text-emerald-400' : ''}`}
          title="Copy"
        >
          {copied
            ? <Check className="h-3.5 w-3.5" />
            : <Copy className="h-3.5 w-3.5" />}
          <span className="text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
        </motion.button>

        {/* Copy username (passwords only) */}
        {isPassword && (
          <motion.button
            whileTap={{ scale: 1.1 }}
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(item.username || '', 'Username copied!');
              flash('user');
            }}
            className={`vault-action-btn transition-all ${copied === 'user' ? 'text-emerald-400' : ''}`}
            title="Copy username"
          >
            {copied === 'user'
              ? <Check className="h-3.5 w-3.5" />
              : <KeyRound className="h-3.5 w-3.5" />}
            <span className="text-[10px]">{copied === 'user' ? 'Copied!' : 'User'}</span>
          </motion.button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {item.isDeleted ? (
          <>
            {/* Recover */}
            <button
              onClick={() => dispatch({ type: 'RECOVER_ITEM', id: item.id })}
              className="vault-action-btn text-emerald-400/70 hover:text-emerald-400"
              title="Recover"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Permanent Delete */}
            <button
              onClick={() => dispatch({ type: 'DELETE_ITEM_PERMANENT', id: item.id })}
              className="vault-action-btn text-red-500/80 hover:text-red-500"
              title="Delete Permanently"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            {/* Make public */}
            <button
              onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', id: item.id })}
              className="vault-action-btn text-emerald-400/70 hover:text-emerald-400"
              title="Make public"
            >
              <Globe className="h-3.5 w-3.5" />
            </button>

            {/* Edit */}
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="vault-action-btn"
                style={{ color: p.accent }}
                title="Edit item"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}
              className="vault-action-btn text-red-400/60 hover:text-red-400"
              title="Move to trash"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
