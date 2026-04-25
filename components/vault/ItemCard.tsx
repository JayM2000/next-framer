'use client';

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Edit3, Lock, FileText, Clipboard, KeyRound, Check, ArrowUpRight, Sparkles, User, Globe, ExternalLink, Star } from 'lucide-react';
import { useVault } from '@/lib/vault/store';
import type { VaultItem } from '@/lib/vault/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import UserProfileHoverCard from './UserProfileHoverCard';

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
  onEdit?: () => void;
}

const ItemCard = memo(function ItemCard({ item, index, onClick, onStatsClick, onEdit }: Props) {
  const { dispatch, copyToClipboard, currentDbUserId, userSettings } = useVault();
  const [copied, setCopied] = useState(false);
  const Icon = typeIcons[item.type];
  const isClipboard = item.type === 'clipboard';
  const isOwner = currentDbUserId !== null && item.userId === currentDbUserId;

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(item.plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    // Track copy count for public items (used for popularity sorting)
    if (item.visibility === 'public') {
      dispatch({ type: 'INCREMENT_COPY_COUNT', id: item.id });
    }
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
      className="vault-glass-card group relative flex cursor-pointer flex-col rounded-xl border border-[var(--vault-border)] transition-shadow hover:shadow-lg hover:shadow-[var(--vault-gold)]/5 hover:border-[var(--vault-gold)]/30"
      style={{ background: typeGradients[item.type] }}
    >


      {/* Important Star Marker */}
      {item.isImportant && (
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
          className="absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 text-[#0a0a0f] shadow-[0_0_12px_rgba(251,191,36,0.8)] ring-[3px] ring-[var(--vault-panel)]"
        >
          <Star className="h-3 w-3 fill-current drop-shadow-sm" />
        </motion.div>
      )}

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
        className="absolute right-3 top-[8px] flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-all duration-200 group-hover:opacity-100"
        style={{ backgroundColor: `${typeColors[item.type]}15`, color: typeColors[item.type] }}
      >
        <ArrowUpRight className="h-3 w-3" />
      </motion.div>

      <div className="flex items-start gap-2.5 p-4 pb-2">
        <motion.div
          whileHover={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${typeColors[item.type]}15`, color: typeColors[item.type] }}
        >
          <Icon className="h-4 w-4" />
        </motion.div>
        <div className="min-w-0 flex-1 pr-8">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[var(--vault-text)]">{item.title}</h3>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--vault-muted)] min-w-0">
            <span className="shrink-0">{new Date(item.createdAt).toLocaleDateString()}</span>
            <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-[var(--vault-muted)] opacity-50" />
            {(() => {
              const showProfileEnabled = userSettings?.showProfileOnPublic ?? false;

              if (isOwner) {
                // Owner sees their own badge
                return (
                  <span className="flex min-w-0 shrink items-center gap-1 rounded-sm bg-[var(--vault-gold)]/15 px-1.5 py-0.5 font-medium text-[var(--vault-gold)] shadow-sm">
                    <User className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate min-w-0">{showProfileEnabled && item.ownerName ? item.ownerName : 'You'}</span>
                  </span>
                );
              }

              // Not the owner
              if (item.ownerShowProfile && item.ownerName && item.userId) {
                // Owner has opted in — show name with hover card
                return (
                  <UserProfileHoverCard userId={item.userId} ownerName={item.ownerName}>
                    <span className="flex min-w-[80px] shrink cursor-pointer items-center gap-1 rounded-sm bg-[var(--vault-gold)]/15 px-1.5 py-0.5 font-medium text-[var(--vault-gold)] shadow-sm transition-colors hover:bg-[var(--vault-gold)]/25">
                      <User className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate min-w-0">{item.ownerName}</span>
                    </span>
                  </UserProfileHoverCard>
                );
              }

              // Anonymous / owner didn't opt in
              return (
                <span className="flex shrink-0 items-center gap-1 rounded-sm bg-slate-500/15 px-1.5 py-0.5 font-medium text-slate-400">
                  <Globe className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">Anonymous</span>
                </span>
              );
            })()}
            
            {/* Inline copy count badge */}
            {(item.copyCount ?? 0) > 0 && (
              <>
                <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-[var(--vault-muted)] opacity-50" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex shrink-0 cursor-default items-center gap-1 rounded-sm bg-indigo-500/15 px-1.5 py-0.5 font-medium text-indigo-400">
                      <Copy className="h-2.5 w-2.5 shrink-0" />
                      <span>{item.copyCount}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="border-indigo-500/30 bg-[var(--vault-glass)] backdrop-blur-xl text-indigo-400 shadow-lg font-medium text-xs">
                    <p>Copied {item.copyCount} times</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Preview */}
      <div className="flex-1 px-4 pb-2">
        <div
          className="vault-content-preview pointer-events-none text-xs text-[var(--vault-muted)] line-clamp-3"
          dangerouslySetInnerHTML={{ __html: item.content }}
        />
      </div>

      {/* Extracted URL Links */}
      {item.extractedUrls && item.extractedUrls.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2" onClick={(e) => e.stopPropagation()}>
          {item.extractedUrls.map((link, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    borderColor: `${typeColors[item.type]}30`,
                    background: `linear-gradient(135deg, ${typeColors[item.type]}08, ${typeColors[item.type]}15)`,
                    color: typeColors[item.type],
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70 transition-opacity group-hover/link:opacity-100" />
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
        className="@container flex items-center gap-1 border-t border-[var(--vault-border)] px-1 py-2 overflow-hidden rounded-b-xl"
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
        {isOwner && (
          <button
            className="vault-action-btn"
            title="Edit item"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
        )}
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
            className={`vault-action-btn transition-all duration-300 ${item.isImportant ? 'text-yellow-400 hover:text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : ''}`}
            title={item.isImportant ? "Remove important mark" : "Mark as important"}
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'TOGGLE_IMPORTANT', id: item.id });
            }}
          >
            <Star className={`h-3.5 w-3.5 ${item.isImportant ? 'fill-current text-yellow-400' : ''}`} />
            <span className={`hidden @[350px]:inline ${item.isImportant ? 'text-yellow-400' : ''}`}>Star</span>
          </button>
        )}
        {isOwner && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', id: item.id })}
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-red-500/10 px-2 py-1.5 text-xs font-medium text-orange-400 transition-all hover:border-orange-500/40 hover:from-orange-500/20 hover:to-red-500/20"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden @[350px]:inline">Private</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="border-orange-500/30 bg-[var(--vault-glass)] backdrop-blur-xl text-orange-600 dark:text-orange-400 shadow-lg font-medium text-xs">
              <p>{item.visibility === 'public' ? "Make Private (Only you can see this)" : "Make Public (Anyone can see this)"}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.div>
  );
});

export default ItemCard;
