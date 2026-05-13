'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import type { ItemType, Visibility, Tag, VaultItem } from '@/lib/vault/types';
import { X, KeyRound, FileText, Clipboard, Globe, Lock, Eye, EyeOff, Loader2, LogIn, ShieldAlert, Shield } from 'lucide-react';
import TagInput from './TagInput';
import PasswordGenerator from './PasswordGenerator';
import ExpiryPicker from './ExpiryPicker';
import dynamic from 'next/dynamic';
import { useAuth, useClerk } from '@clerk/nextjs';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

const TYPE_TABS: { type: ItemType; icon: typeof KeyRound; label: string }[] = [
  { type: 'password', icon: KeyRound, label: 'Password' },
  { type: 'clipboard', icon: Clipboard, label: 'Clipboard' },
  { type: 'note', icon: FileText, label: 'Secure Note' },
];

export default function CreateItemModal() {
  const { state, dispatch, showToast, isCreating } = useVault();
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const open = state.drawerOpen;

  const [itemType, setItemType] = useState<ItemType>('clipboard');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [title, setTitle] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [encryptContent, setEncryptContent] = useState(false);

  const reset = useCallback(() => {
    setItemType(isSignedIn ? 'password' : 'clipboard');
    setVisibility('public');
    setTitle('');
    setSiteName('');
    setSiteUrl('');
    setUsername('');
    setPassword('');
    setShowPass(false);
    setContent('');
    setPlainText('');
    setTags([]);
    setExpiresAt(null);
    setEncryptContent(false);
  }, [isSignedIn]);

  const handleClose = () => {
    dispatch({ type: 'SET_DRAWER', open: false });
  };

  const handleSave = () => {
    // Block password creation for logged-out users
    if (!isSignedIn && itemType === 'password') {
      showToast('Please sign in to create passwords', 'warning');
      return;
    }

    if (!title.trim()) {
      showToast('Title is required');
      return;
    }

    const newItem: VaultItem = {
      id: crypto.randomUUID(),
      type: itemType,
      visibility: !isSignedIn ? 'public' : visibility,
      title: title.trim(),
      content: itemType === 'password' ? `<p>${siteName}</p>` : content,
      plainText: itemType === 'password' ? siteName : plainText,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(itemType === 'password' && {
        siteUrl,
        username,
        password,
      }),
      ...(expiresAt && { expiresAt }),
      isContentEncrypted: encryptContent && visibility === 'public' && itemType !== 'password',
    };

    dispatch({
      type: 'ADD_ITEM',
      item: newItem,
      onSuccess: () => {
        showToast('Item created!');
        reset();
      },
      onSettled: () => {
        handleClose();
      }
    });
  };

  const isPasswordDisabled = !isSignedIn && itemType === 'password';

  return (
    <AnimatePresence>
      {/* Backdrop */}
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* Modal */}
      {open && (
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-45%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-1/2 top-1/2 z-50 flex h-[85vh] w-[95vw] flex-col rounded-2xl border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl md:h-[80vh] md:w-[60vw]"
        >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--vault-border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--vault-text)]">New Item</h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-[var(--vault-muted)] hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Fixed Controls */}
            <div className="flex shrink-0 flex-col space-y-4 border-b border-[var(--vault-border)] px-5 py-4">
              {/* Type Tabs */}
              <div className="flex gap-2">
                {TYPE_TABS.map(({ type, icon: Icon, label }) => {
                  const isDisabledTab = !isSignedIn && type === 'password';
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        if (isDisabledTab) return; // don't switch to disabled tab
                        setItemType(type);
                        // Passwords are always private — force it
                        if (type === 'password') setVisibility('private');
                        // Anonymous users are always public
                        if (!isSignedIn) setVisibility('public');
                      }}
                      className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        isDisabledTab
                          ? 'border-[var(--vault-border)] text-[var(--vault-muted)]/40 opacity-50 cursor-not-allowed'
                          : itemType === type
                            ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                            : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-[var(--vault-gold)]/30'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                      {isDisabledTab && (
                        <Lock className="h-3 w-3 ml-0.5 opacity-60" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Password Login Required Banner — shown when logged out */}
              <AnimatePresence>
                {!isSignedIn && itemType !== 'password' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    {/* Inline hint about password tab */}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Visibility Toggle */}
              {!isSignedIn ? (
                /* Logged-out: always public, no toggle */
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--vault-muted)]">Visibility</span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    <Globe className="h-3 w-3" /> Public Only
                  </span>
                  <span className="text-[10px] text-[var(--vault-muted)]/60 italic">Sign in for private items</span>
                </div>
              ) : itemType === 'password' ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--vault-muted)]">Visibility</span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--vault-gold)]/20 bg-[var(--vault-gold)]/10 px-3 py-1 text-xs font-medium text-[var(--vault-gold)]">
                    <Lock className="h-3 w-3" /> Always Private
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--vault-muted)]">Visibility</span>
                  <div className="flex rounded-lg border border-[var(--vault-border)] p-0.5">
                    <button
                      onClick={() => setVisibility('public')}
                      className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                        visibility === 'public'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-[var(--vault-muted)]'
                      }`}
                    >
                      <Globe className="h-3 w-3" /> Public
                    </button>
                    <button
                      onClick={() => setVisibility('private')}
                      className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                        visibility === 'private'
                          ? 'bg-[var(--vault-gold)]/20 text-[var(--vault-gold)]'
                          : 'text-[var(--vault-muted)]'
                      }`}
                    >
                      <Lock className="h-3 w-3" /> Private
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Password disabled overlay for logged-out users */}
              {isPasswordDisabled ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-5"
                >
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(245,158,11,0.1)',
                        '0 0 40px rgba(245,158,11,0.2)',
                        '0 0 20px rgba(245,158,11,0.1)',
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--vault-gold)]/20 to-amber-600/10 border border-[var(--vault-gold)]/30"
                  >
                    <ShieldAlert className="h-10 w-10 text-[var(--vault-gold)]" />
                  </motion.div>

                  <div className="text-center space-y-2 max-w-[280px]">
                    <h3 className="text-base font-semibold text-[var(--vault-text)]">
                      Password Vault Locked
                    </h3>
                    <p className="text-xs text-[var(--vault-muted)] leading-relaxed">
                      Sign in to securely store your passwords with end-to-end encryption. Your credentials stay private and protected.
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => openSignIn()}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--vault-gold)] to-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In to Continue
                  </motion.button>

                  <p className="text-[10px] text-[var(--vault-muted)]/50">
                    You can still create clipboards and notes without signing in
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--vault-muted)]">Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="vault-input"
                      placeholder="Item title"
                    />
                  </div>

                  {/* Password Type Fields */}
                  {itemType === 'password' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[var(--vault-muted)]">Site Name</label>
                          <input
                            type="text"
                            value={siteName}
                            onChange={(e) => setSiteName(e.target.value)}
                            className="vault-input"
                            placeholder="e.g. GitHub"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-[var(--vault-muted)]">URL</label>
                          <input
                            type="text"
                            value={siteUrl}
                            onChange={(e) => setSiteUrl(e.target.value)}
                            className="vault-input"
                            placeholder="e.g. github.com"
                          />
                        </div>
                      </div>

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
                    </div>
                  )}

                  {/* Rich Editor for clipboard/note */}
                  {(itemType === 'clipboard' || itemType === 'note') && (
                    <div className="space-y-1.5">
                      {/* Encrypt Content Toggle — only for public clipboard/note */}
                      {visibility === 'public' && (
                        <div
                          className={`relative overflow-hidden rounded-lg border p-3 flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer mb-3 ${
                            encryptContent
                              ? 'border-[var(--vault-gold)]/40 bg-gradient-to-r from-[var(--vault-gold)]/10 via-amber-500/5 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                              : 'border-[var(--vault-border)] bg-[var(--vault-glass)] hover:border-[var(--vault-gold)]/20'
                          }`}
                          onClick={() => setEncryptContent(!encryptContent)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 ${
                              encryptContent
                                ? 'bg-[var(--vault-gold)]/20 text-[var(--vault-gold)] shadow-sm shadow-[var(--vault-gold)]/10'
                                : 'bg-[var(--vault-glass-hover)] text-[var(--vault-muted)]'
                            }`}>
                              <Shield className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className={`text-xs font-semibold transition-colors duration-300 ${
                                encryptContent ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-text)]'
                              }`}>Encrypt Content</p>
                              <p className="text-[10px] text-[var(--vault-muted)] leading-tight">
                                {encryptContent ? 'Content hidden — only revealed on copy' : 'Content will be publicly visible'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={encryptContent}
                            onClick={(e) => { e.stopPropagation(); setEncryptContent(!encryptContent); }}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                              encryptContent
                                ? 'bg-gradient-to-r from-[var(--vault-gold)] to-amber-600 shadow-sm shadow-[var(--vault-gold)]/30'
                                : 'bg-[var(--vault-muted)]/30'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all duration-300 ${
                              encryptContent ? 'ml-[18px]' : 'ml-[3px]'
                            }`} />
                          </button>
                        </div>
                      )}
                      <label className="text-xs font-medium text-[var(--vault-muted)]">Content</label>
                      <RichEditor
                        content={content}
                        onChange={(html, text) => { setContent(html); setPlainText(text); }}
                        placeholder="Start writing..."
                      />
                    </div>
                  )}

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--vault-muted)]">Tags</label>
                    <TagInput tags={tags} onChange={setTags} />
                  </div>

                  {/* Expiry Picker */}
                  <div className="space-y-1.5">
                    <ExpiryPicker value={expiresAt} onChange={setExpiresAt} />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--vault-border)] px-5 py-3">
              <button
                onClick={handleClose}
                className="rounded-lg border border-[var(--vault-border)] px-4 py-2 text-xs font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isCreating || isPasswordDisabled}
                className="vault-btn-primary disabled:opacity-50"
              >
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  'Save Item'
                )}
              </button>
            </div>
          </motion.div>
      )}
    </AnimatePresence>
  );
}
