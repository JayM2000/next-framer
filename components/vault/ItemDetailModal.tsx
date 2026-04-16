'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import type { VaultItem } from '@/lib/vault/types';
import {
  X, Copy, Trash2, Lock, Globe, KeyRound, FileText, Clipboard,
  Eye, EyeOff, ExternalLink, Calendar, Clock, Tag as TagIcon,
  Download, Check, Hash, Type, AlignLeft, Code2,
  Sparkles,
} from 'lucide-react';

const typeConfig = {
  password: { icon: KeyRound, color: '#c9a84c', label: 'Password', gradient: 'from-amber-500/20 to-yellow-600/10' },
  note:     { icon: FileText, color: '#8b5cf6', label: 'Secure Note', gradient: 'from-violet-500/20 to-purple-600/10' },
  clipboard:{ icon: Clipboard, color: '#06b6d4', label: 'Clipboard', gradient: 'from-cyan-500/20 to-teal-600/10' },
};

type ContentTab = 'rendered' | 'raw' | 'stats';

interface Props {
  item: VaultItem | null;
  onClose: () => void;
  initialTab?: ContentTab;
}

/* ─── Animated Counter ─── */
function AnimatedStat({ value, label, icon: Icon, delay }: { value: number; label: string; icon: React.ElementType; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--vault-border)] bg-[var(--vault-glass)] px-4 py-3"
    >
      <Icon className="h-4 w-4 text-[var(--vault-muted)]" />
      <motion.span
        className="text-xl font-bold text-[var(--vault-text)]"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.15, type: 'spring', stiffness: 400, damping: 20 }}
      >
        {value.toLocaleString()}
      </motion.span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">{label}</span>
    </motion.div>
  );
}

/* ─── Code Block with line-by-line copy ─── */
function InteractiveCodeBlock({ code, onCopyLine }: { code: string; onCopyLine: (line: string, idx: number) => void }) {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const lines = code.split('\n');

  const handleCopyLine = (line: string, idx: number) => {
    onCopyLine(line, idx);
    setCopiedLine(idx);
    setTimeout(() => setCopiedLine(null), 1500);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--vault-border)] bg-[var(--vault-glass)]">
      <div className="min-w-0 p-1">
        {lines.map((line, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.02 * idx, duration: 0.2 }}
            onMouseEnter={() => setHoveredLine(idx)}
            onMouseLeave={() => setHoveredLine(null)}
            className="group/line flex items-center rounded-lg transition-colors hover:bg-[var(--vault-glass-hover)]"
          >
            <span className="w-8 shrink-0 select-none pr-2 text-right font-mono text-[10px] text-[var(--vault-muted)] opacity-50">
              {idx + 1}
            </span>
            <pre className="flex-1 overflow-x-auto py-0.5 font-mono text-xs text-[var(--vault-text)]">
              <code>{line || ' '}</code>
            </pre>
            <AnimatePresence>
              {hoveredLine === idx && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handleCopyLine(line, idx)}
                  className="mr-1 shrink-0 rounded-md p-1 text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                  title="Copy line"
                >
                  {copiedLine === idx
                    ? <Check className="h-3 w-3 text-emerald-400" />
                    : <Copy className="h-3 w-3" />}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function ItemDetailModal({ item, onClose, initialTab = 'rendered' }: Props) {
  const { dispatch, copyToClipboard, showToast } = useVault();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    if (!item) return { chars: 0, words: 0, lines: 0, codeBlocks: 0 };
    const text = item.plainText;
    const chars = text.length;
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = text.split('\n').length;
    const codeBlockCount = (item.content.match(/<pre>/gi) || []).length;
    return { chars, words, lines, codeBlocks: codeBlockCount };
  }, [item]);

  /* ─── Extract code blocks from HTML ─── */
  const codeBlocks = useMemo(() => {
    if (!item) return [];
    const regex = /<pre><code>([\s\S]*?)<\/code><\/pre>/gi;
    const blocks: string[] = [];
    let match;
    while ((match = regex.exec(item.content)) !== null) {
      const decoded = match[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
      blocks.push(decoded);
    }
    return blocks;
  }, [item]);

  if (!item) return null;

  const config = typeConfig[item.type];
  const Icon = config.icon;
  const isClipboard = item.type === 'clipboard';

  const handleCopy = (text: string, field: string) => {
    copyToClipboard(text, `${field} copied!`);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    dispatch({ type: 'DELETE_ITEM', id: item.id });
    showToast('Item deleted');
    onClose();
  };

  const handleToggleVisibility = () => {
    dispatch({ type: 'TOGGLE_VISIBILITY', id: item.id });
    showToast(item.visibility === 'public' ? 'Moved to private vault' : 'Made public');
  };

  const handleExportText = () => {
    const blob = new Blob([item.plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded as text file');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const contentTabs: { id: ContentTab; label: string; icon: React.ElementType }[] = isClipboard
    ? [
        { id: 'rendered', label: 'Preview', icon: Eye },
        { id: 'raw', label: 'Raw', icon: Code2 },
        { id: 'stats', label: 'Stats', icon: Sparkles },
      ]
    : [];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.92, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 flex flex-col rounded-2xl border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl sm:max-w-2xl sm:w-[90vw] sm:max-h-[85vh]"
      >
        {/* ─── Hero Header ─── */}
        <div className={`relative shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-br ${config.gradient}`}>
          {/* Decorative animated circles */}
          <motion.div
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-10"
            style={{ background: config.color }}
            animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -left-4 bottom-0 h-20 w-20 rounded-full opacity-5"
            style={{ background: config.color }}
            animate={{ scale: [1, 1.2, 1], y: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          {/* Shimmer line */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${config.color}60, transparent)` }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative flex items-start justify-between px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                className="flex h-11 w-11 items-center justify-center rounded-xl shadow-md"
                style={{ backgroundColor: `${config.color}25`, color: config.color }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <div>
                <motion.h2
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-lg font-bold text-[var(--vault-text)]"
                >
                  {item.title}
                </motion.h2>
                <div className="mt-0.5 flex items-center gap-2">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: `${config.color}20`, color: config.color }}
                  >
                    {config.label}
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      item.visibility === 'public'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-[var(--vault-gold)]/15 text-[var(--vault-gold)]'
                    }`}
                  >
                    {item.visibility === 'public' ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                    {item.visibility}
                  </motion.span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--vault-muted)] transition-all hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* ─── Content Tabs (Clipboard only) ─── */}
          {isClipboard && contentTabs.length > 0 && (
            <div className="relative flex gap-0.5 px-5 pb-2 sm:px-6">
              {contentTabs.map((tab, i) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--vault-text)]'
                        : 'text-[var(--vault-muted)] hover:text-[var(--vault-text)]'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="tab-bg"
                        className="absolute inset-0 rounded-lg bg-[var(--vault-glass-hover)]"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <TabIcon className="h-3 w-3" />
                      {tab.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Scrollable Body ─── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5">

          {/* Password-specific fields */}
          {item.type === 'password' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              {/* Site URL */}
              {item.siteUrl && (
                <div className="vault-glass-card flex items-center justify-between rounded-xl border border-[var(--vault-border)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Website</p>
                    <p className="truncate text-sm font-medium text-[var(--vault-text)]">{item.siteUrl}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleCopy(item.siteUrl!, 'url')}
                      className="rounded-lg p-2 text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                    >
                      {copiedField === 'url' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </motion.button>
                    <a
                      href={`https://${item.siteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Username */}
              {item.username && (
                <div className="vault-glass-card flex items-center justify-between rounded-xl border border-[var(--vault-border)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Username</p>
                    <p className="truncate text-sm font-medium text-[var(--vault-text)]">{item.username}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleCopy(item.username!, 'username')}
                    className="rounded-lg p-2 text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                  >
                    {copiedField === 'username' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </motion.button>
                </div>
              )}

              {/* Password */}
              {item.password && (
                <div className="vault-glass-card flex items-center justify-between rounded-xl border border-[var(--vault-border)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Password</p>
                    <p className="truncate font-mono text-sm font-medium text-[var(--vault-text)]">
                      {showPassword ? item.password : '•'.repeat(Math.min(item.password.length, 20))}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowPassword(!showPassword)}
                      className="rounded-lg p-2 text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleCopy(item.password!, 'password')}
                      className="rounded-lg p-2 text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                    >
                      {copiedField === 'password' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Clipboard Tabs Content ─── */}
          {isClipboard ? (
            <AnimatePresence mode="wait">
              {activeTab === 'rendered' && (
                <motion.div
                  key="rendered"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Rendered content */}
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Content</p>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleCopy(item.plainText, 'content')}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                    >
                      {copiedField === 'content' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedField === 'content' ? 'Copied!' : 'Copy All'}
                    </motion.button>
                  </div>
                  <div className="vault-glass-card overflow-hidden rounded-xl border border-[var(--vault-border)] px-4 py-3">
                    <div
                      className="vault-editor-content prose prose-sm max-w-none text-sm text-[var(--vault-text)]"
                      dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                  </div>

                  {/* Interactive code blocks */}
                  {codeBlocks.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">
                        <Code2 className="h-3 w-3" />
                        Code Snippets ({codeBlocks.length})
                      </p>
                      {codeBlocks.map((block, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.08 }}
                        >
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-[var(--vault-muted)]">Block {i + 1}</span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleCopy(block, `code-${i}`)}
                              className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                            >
                              {copiedField === `code-${i}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              {copiedField === `code-${i}` ? 'Copied!' : 'Copy Block'}
                            </motion.button>
                          </div>
                          <InteractiveCodeBlock
                            code={block}
                            onCopyLine={(line) => copyToClipboard(line, 'Line copied!')}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'raw' && (
                <motion.div
                  key="raw"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Raw Text</p>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleCopy(item.plainText, 'raw')}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                    >
                      {copiedField === 'raw' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedField === 'raw' ? 'Copied!' : 'Copy'}
                    </motion.button>
                  </div>
                  <InteractiveCodeBlock
                    code={item.plainText}
                    onCopyLine={(line) => copyToClipboard(line, 'Line copied!')}
                  />
                </motion.div>
              )}

              {activeTab === 'stats' && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">
                    <Sparkles className="h-3 w-3" />
                    Content Statistics
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <AnimatedStat value={stats.chars} label="Characters" icon={Hash} delay={0.05} />
                    <AnimatedStat value={stats.words} label="Words" icon={Type} delay={0.1} />
                    <AnimatedStat value={stats.lines} label="Lines" icon={AlignLeft} delay={0.15} />
                    <AnimatedStat value={stats.codeBlocks} label="Code Blocks" icon={Code2} delay={0.2} />
                  </div>

                  {/* Content breakdown bar */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                    className="origin-left"
                  >
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Content Breakdown</p>
                    <div className="flex h-3 overflow-hidden rounded-full bg-[var(--vault-glass)]">
                      {stats.codeBlocks > 0 && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(30, (stats.codeBlocks / (stats.codeBlocks + 2)) * 100)}%` }}
                          transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
                          className="bg-cyan-500/50 rounded-l-full"
                          title="Code"
                        />
                      )}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: stats.codeBlocks > 0 ? `${100 - Math.max(30, (stats.codeBlocks / (stats.codeBlocks + 2)) * 100)}%` : '100%' }}
                        transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
                        className="bg-[var(--vault-gold)]/30 rounded-r-full"
                        title="Text"
                      />
                    </div>
                    <div className="mt-1.5 flex items-center gap-4">
                      {stats.codeBlocks > 0 && (
                        <span className="flex items-center gap-1.5 text-[10px] text-[var(--vault-muted)]">
                          <span className="h-2 w-2 rounded-full bg-cyan-500/50" /> Code
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[10px] text-[var(--vault-muted)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--vault-gold)]/30" /> Text
                      </span>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            /* ─── Non-clipboard items: normal content ─── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Content</p>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCopy(item.plainText, 'content')}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
                >
                  {copiedField === 'content' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedField === 'content' ? 'Copied!' : 'Copy'}
                </motion.button>
              </div>
              <div className="vault-glass-card overflow-hidden rounded-xl border border-[var(--vault-border)] px-4 py-3">
                <div
                  className="vault-editor-content prose prose-sm max-w-none text-sm text-[var(--vault-text)]"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              </div>
            </motion.div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">
                <TagIcon className="h-3 w-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, i) => (
                  <motion.span
                    key={tag.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    whileHover={{ scale: 1.08 }}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium cursor-default"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.label}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Metadata */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap gap-4 rounded-xl bg-[var(--vault-glass)] px-4 py-3"
          >
            <div className="flex items-center gap-2 text-xs text-[var(--vault-muted)]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {formatDate(item.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--vault-muted)]">
              <Clock className="h-3.5 w-3.5" />
              <span>Updated {formatDate(item.updatedAt)} at {formatTime(item.updatedAt)}</span>
            </div>
          </motion.div>
        </div>

        {/* ─── Action Footer ─── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex shrink-0 items-center justify-between border-t border-[var(--vault-border)] px-5 py-3 sm:px-6"
        >
          <div className="flex gap-2 flex-wrap">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleVisibility}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--vault-border)] px-3 py-2 text-xs font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
            >
              {item.visibility === 'public' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {item.visibility === 'public' ? 'Make Private' : 'Make Public'}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCopy(item.plainText, 'all')}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--vault-border)] px-3 py-2 text-xs font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
            >
              {copiedField === 'all' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              Copy All
            </motion.button>

            {/* Download as text */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleExportText}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--vault-border)] px-3 py-2 text-xs font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              confirmDelete
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'border border-[var(--vault-border)] text-[var(--vault-muted)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? 'Confirm Delete' : 'Delete'}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
