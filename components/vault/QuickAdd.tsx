'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useVault } from '@/lib/vault/store';
import { Plus, Clipboard, Loader2, Sparkles } from 'lucide-react';
import type { VaultItem, Tag } from '@/lib/vault/types';
import TagInput from './TagInput';
import SettingsModal from './SettingsModal';
import { motion } from 'framer-motion';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

export default function QuickAdd() {
  const { dispatch, showToast, isCreating } = useVault();
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

        {/* Content (Mandatory) */}
        <div className="min-h-[150px]">
          <RichEditor
            content={content}
            onChange={(html, text) => { setContent(html); setPlainText(text); }}
            placeholder="Paste your snippet..."
          />
        </div>
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

