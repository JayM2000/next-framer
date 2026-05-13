'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useVault } from '@/lib/vault/store';
import { Plus, Clipboard, Loader2, Sparkles, Shield } from 'lucide-react';
import type { VaultItem, Tag } from '@/lib/vault/types';
import TagInput from './TagInput';
import SettingsModal from './SettingsModal';
import ExpiryPicker from './ExpiryPicker';
import { motion } from 'framer-motion';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

export default function QuickAdd() {
  const { dispatch, showToast, isCreating } = useVault();
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [encryptContent, setEncryptContent] = useState(false);

  const handleSave = () => {
    // If stripped plainText is empty, reject
    if (!plainText.trim() && content.replace(/<[^>]*>?/gm, '').trim() === '') {
      showToast('Content cannot be empty');
      return;
    }

    const newItem: VaultItem = {
      id: crypto.randomUUID(),
      type: 'clipboard',
      visibility: 'public',
      title: title.trim(),
      content,
      plainText,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isContentEncrypted: encryptContent,
      ...(expiresAt && { expiresAt }),
    };

    dispatch({
      type: 'ADD_ITEM',
      item: newItem,
      onSuccess: () => {
        showToast('Snippet created!');
        setContent('');
        setPlainText('');
        setTitle('');
        setTags([]);
        setExpiresAt(null);
        setEncryptContent(false);
      }
    });
  };

  const isContentEmpty = !plainText.trim() && content.replace(/<[^>]*>?/gm, '').trim() === '';

  return (
    <div className="vault-glass-card flex flex-col rounded-xl border border-[var(--vault-border)] shadow-sm" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Fixed Header */}
      <div className="shrink-0 border-b border-[var(--vault-border)] px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--vault-text)]">
          <Clipboard className="h-4 w-4 text-[var(--vault-gold)]" /> Quick Snippet
        </h3>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Auto Tag Info Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
          className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[var(--vault-gold)]/10 to-transparent border border-[var(--vault-gold)]/20 p-3 flex gap-3 items-start shadow-sm"
        >
          <motion.div
            animate={{ rotate: [0, 15, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Sparkles className="h-4 w-4 text-[var(--vault-gold)] shrink-0 mt-0.5" />
          </motion.div>
          <p className="text-xs text-[var(--vault-muted)] leading-relaxed">
            <span className="font-semibold text-[var(--vault-text)]">Pro Tip:</span> You can go to <strong className="text-[var(--vault-gold)] font-medium cursor-pointer underline underline-offset-2 hover:text-amber-400 transition-colors" onClick={() => setSettingsOpen(true)}>Settings</strong> and enable <strong className="text-[var(--vault-gold)] font-medium">Auto Tag</strong> to automatically generate tags for your snippets!
          </p>
        </motion.div>

        {/* Title (Optional) */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="vault-input text-xs"
            placeholder="Title (optional)"
          />
        </div>

        {/* Tags (Optional) */}
        <div>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {/* Encrypt Content Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.15 }}
          className={`relative overflow-hidden rounded-lg border p-3 flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer ${
            encryptContent
              ? 'border-[var(--vault-gold)]/40 bg-gradient-to-r from-[var(--vault-gold)]/10 via-amber-500/5 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.08)]'
              : 'border-[var(--vault-border)] bg-[var(--vault-glass)] hover:border-[var(--vault-gold)]/20'
          }`}
          onClick={() => setEncryptContent(!encryptContent)}
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={encryptContent ? { rotate: [0, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300 ${
                encryptContent
                  ? 'bg-[var(--vault-gold)]/20 text-[var(--vault-gold)] shadow-sm shadow-[var(--vault-gold)]/10'
                  : 'bg-[var(--vault-glass-hover)] text-[var(--vault-muted)]'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
            </motion.div>
            <div>
              <p className={`text-xs font-semibold transition-colors duration-300 ${
                encryptContent ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-text)]'
              }`}>
                Encrypt Content
              </p>
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
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ${
                encryptContent ? 'ml-[18px]' : 'ml-[3px]'
              }`}
            />
          </button>
        </motion.div>

        {/* Content (Mandatory) */}
        <div className="min-h-[150px]">
          <RichEditor
            content={content}
            onChange={(html, text) => { setContent(html); setPlainText(text); }}
            placeholder="Paste your snippet..."
          />
        </div>

        {/* Expiry Picker */}
        <ExpiryPicker value={expiresAt} onChange={setExpiresAt} />
      </div>

      {/* Fixed Footer — Add Snippet Button */}
      <div className="shrink-0 border-t border-[var(--vault-border)] px-5 py-3">
        <button
          onClick={handleSave}
          disabled={isContentEmpty || isCreating}
          className="vault-btn-primary w-full disabled:opacity-50 !py-2"
        >
          {isCreating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Plus className="h-4 w-4" /> Add Snippet</>
          )}
        </button>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} highlightAutoTag={true} />
    </div>
  );
}

