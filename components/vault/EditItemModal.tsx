'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import type { VaultItem, Tag, Visibility } from '@/lib/vault/types';
import {
  X, KeyRound, FileText, Clipboard, Globe, Lock,
  Eye, EyeOff, Loader2, Save, Calendar, Clock,
  Hash, Shield, Pencil, Info,
} from 'lucide-react';
import TagInput from './TagInput';
import PasswordGenerator from './PasswordGenerator';
import dynamic from 'next/dynamic';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

const typeConfig = {
  password: { icon: KeyRound, color: '#c9a84c', label: 'Password', gradient: 'from-amber-500/20 to-yellow-600/10' },
  note:     { icon: FileText, color: '#8b5cf6', label: 'Secure Note', gradient: 'from-violet-500/20 to-purple-600/10' },
  clipboard:{ icon: Clipboard, color: '#06b6d4', label: 'Clipboard', gradient: 'from-cyan-500/20 to-teal-600/10' },
};

interface Props {
  item: VaultItem | null;
  onClose: () => void;
}

export default function EditItemModal({ item, onClose }: Props) {
  const { dispatch, showToast } = useVault();

  // Cache item so content is available during exit animation
  const [cachedItem, setCachedItem] = useState<VaultItem | null>(item);
  useEffect(() => {
    if (item) setCachedItem(item);
  }, [item]);

  const displayItem = item || cachedItem;

  // ── Form state ──
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setVisibility(item.visibility);
      setSiteUrl(item.siteUrl ?? '');
      setUsername(item.username ?? '');
      setPassword(item.password ?? '');
      setContent(item.content);
      setPlainText(item.plainText);
      setTags(item.tags);
      setShowPass(false);
    }
  }, [item]);

  const handleSave = useCallback(() => {
    if (!item) return;
    if (!title.trim()) {
      showToast('Title is required');
      return;
    }

    setIsSaving(true);

    const updatedItem: VaultItem = {
      ...item,
      title: title.trim(),
      visibility,
      content: item.type === 'password' ? item.content : content,
      plainText: item.type === 'password' ? item.plainText : plainText,
      tags,
      updatedAt: new Date().toISOString(),
      ...(item.type === 'password' && {
        siteUrl: siteUrl || undefined,
        username: username || undefined,
        password: password || undefined,
      }),
    };

    dispatch({
      type: 'UPDATE_ITEM',
      item: updatedItem,
      onSuccess: () => {
        showToast('Item updated successfully!');
        onClose();
      },
      onError: (error) => {
        showToast('Failed to update item');
        console.error('Update error:', error);
      },
      onSettled: () => {
        setIsSaving(false);
      },
    });
  }, [item, title, visibility, siteUrl, username, password, content, plainText, tags, dispatch, showToast, onClose]);

  if (!displayItem) return null;

  const config = typeConfig[displayItem.type];
  const TypeIcon = config.icon;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="edit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-lg"
          />

          {/* Modal */}
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0, scale: 0.88, y: 60, rotateX: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 40, rotateX: 4 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[60] flex flex-col rounded-2xl border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl sm:max-w-2xl sm:w-[90vw] sm:max-h-[85vh]"
            style={{ perspective: '1200px' }}
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
                    <Pencil className="h-5 w-5" />
                  </motion.div>
                  <div>
                    <motion.h2
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 }}
                      className="text-lg font-bold text-[var(--vault-text)]"
                    >
                      Edit Item
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
            </div>

            {/* ─── Scrollable Body ─── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5">

              {/* Read-Only Info Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="mb-3 flex items-center gap-1.5">
                  <Info className="h-3 w-3 text-[var(--vault-muted)]" />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">
                    Item Information
                    <span className="ml-2 normal-case tracking-normal text-[var(--vault-muted)]/60">(read-only)</span>
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Type */}
                  <div className="vault-glass-card flex items-center gap-3 rounded-xl border border-[var(--vault-border)] px-4 py-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${config.color}15`, color: config.color }}
                    >
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Type</p>
                      <p className="text-sm font-medium text-[var(--vault-text)]">{config.label}</p>
                    </div>
                  </div>
                  {/* ID */}
                  <div className="vault-glass-card flex items-center gap-3 rounded-xl border border-[var(--vault-border)] px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--vault-glass)]">
                      <Hash className="h-4 w-4 text-[var(--vault-muted)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Item ID</p>
                      <p className="truncate font-mono text-[10px] text-[var(--vault-text)]/70">{displayItem.id}</p>
                    </div>
                  </div>
                  {/* Created */}
                  <div className="vault-glass-card flex items-center gap-3 rounded-xl border border-[var(--vault-border)] px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--vault-glass)]">
                      <Calendar className="h-4 w-4 text-[var(--vault-muted)]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Created</p>
                      <p className="text-xs text-[var(--vault-text)]">{formatDate(displayItem.createdAt)}</p>
                    </div>
                  </div>
                  {/* Updated */}
                  <div className="vault-glass-card flex items-center gap-3 rounded-xl border border-[var(--vault-border)] px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--vault-glass)]">
                      <Clock className="h-4 w-4 text-[var(--vault-muted)]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Last Updated</p>
                      <p className="text-xs text-[var(--vault-text)]">{formatDate(displayItem.updatedAt)} at {formatTime(displayItem.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── Editable Fields Section ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="mb-3 flex items-center gap-1.5">
                  <Pencil className="h-3 w-3" style={{ color: config.color }} />
                  <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: config.color }}>
                    Editable Fields
                  </p>
                </div>
                <div className="space-y-4">

                  {/* Title */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-medium text-[var(--vault-muted)]">Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="vault-input"
                      placeholder="Item title"
                    />
                  </motion.div>

                  {/* Visibility Toggle */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-medium text-[var(--vault-muted)]">Visibility</label>
                    <div className="flex items-center gap-3">
                      <div className="flex rounded-lg border border-[var(--vault-border)] p-0.5">
                        <button
                          onClick={() => setVisibility('public')}
                          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                            visibility === 'public'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'text-[var(--vault-muted)] hover:text-[var(--vault-text)]'
                          }`}
                        >
                          <Globe className="h-3 w-3" /> Public
                        </button>
                        <button
                          onClick={() => setVisibility('private')}
                          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                            visibility === 'private'
                              ? 'bg-[var(--vault-gold)]/20 text-[var(--vault-gold)]'
                              : 'text-[var(--vault-muted)] hover:text-[var(--vault-text)]'
                          }`}
                        >
                          <Lock className="h-3 w-3" /> Private
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Password-specific fields */}
                  {displayItem.type === 'password' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="space-y-4"
                    >
                      {/* Site URL */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--vault-muted)]">Website URL</label>
                        <input
                          type="text"
                          value={siteUrl}
                          onChange={(e) => setSiteUrl(e.target.value)}
                          className="vault-input"
                          placeholder="e.g. github.com"
                        />
                      </div>

                      {/* Username */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--vault-muted)]">Username</label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="vault-input"
                          placeholder="Username or email"
                        />
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--vault-muted)]">Password</label>
                        <div className="relative">
                          <input
                            type={showPass ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="vault-input pr-10"
                            placeholder="Enter password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
                          >
                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PasswordGenerator value={password} onChange={setPassword} />
                      </div>
                    </motion.div>
                  )}

                  {/* Rich Editor for clipboard/note */}
                  {(displayItem.type === 'clipboard' || displayItem.type === 'note') && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="space-y-1.5"
                    >
                      <label className="text-xs font-medium text-[var(--vault-muted)]">Content</label>
                      <RichEditor
                        content={content}
                        onChange={(html, text) => { setContent(html); setPlainText(text); }}
                        placeholder="Start writing..."
                      />
                    </motion.div>
                  )}

                  {/* Tags */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-1.5"
                  >
                    <label className="text-xs font-medium text-[var(--vault-muted)]">Tags</label>
                    <TagInput tags={tags} onChange={setTags} />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* ─── Action Footer ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex shrink-0 items-center justify-between border-t border-[var(--vault-border)] px-5 py-3 sm:px-6"
            >
              <div className="flex items-center gap-2 text-[10px] text-[var(--vault-muted)]">
                <Shield className="h-3 w-3" />
                <span>Only owners can edit items</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  disabled={isSaving}
                  className="rounded-lg border border-[var(--vault-border)] px-4 py-2 text-xs font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="vault-btn-primary disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Save Changes</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
