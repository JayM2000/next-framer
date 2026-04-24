'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useVault } from '@/lib/vault/store';
import { Zap, X, Plus, Loader2 } from 'lucide-react';
import type { VaultItem, Tag } from '@/lib/vault/types';
import TagInput from './TagInput';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

export default function MobileQuickAdd() {
  const { dispatch, showToast, isCreating } = useVault();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);

  const isContentEmpty = !plainText.trim() && content.replace(/<[^>]*>?/gm, '').trim() === '';

  const handleSave = useCallback(() => {
    if (isContentEmpty) {
      showToast('Content cannot be empty');
      return;
    }

    const newItem: VaultItem = {
      id: crypto.randomUUID(),
      type: 'clipboard',
      visibility: 'public',
      title: title.trim() || 'Quick Snippet',
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
      },
      onSettled: () => {
        setOpen(false);
      }
    });
  }, [content, plainText, title, isContentEmpty, dispatch, showToast]);

  return (
    <>
      {/* FAB — only visible on mobile, positioned above MobileNav */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[72px] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--vault-gold)] to-amber-600 text-white shadow-lg shadow-amber-500/30 sm:hidden active:scale-95 transition-transform"
            aria-label="Quick Add Snippet"
          >
            <Zap className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {/* Backdrop */}
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:hidden"
          />
        )}

        {/* Sheet */}
        {open && (
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-2xl border-t border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl sm:hidden"
          >
            {/* Handle + Header */}
            <div className="flex shrink-0 flex-col items-center px-4 pt-3 pb-2">
              {/* Drag handle */}
              <div className="mb-3 h-1 w-10 rounded-full bg-[var(--vault-muted)]/30" />

              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--vault-gold)]/15">
                      <Zap className="h-3.5 w-3.5 text-[var(--vault-gold)]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--vault-text)]">
                      Quick Snippet
                    </h3>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1.5 text-[var(--vault-muted)] hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body — scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {/* Title (optional) */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="vault-input text-xs"
                  placeholder="Title (optional)"
                />

                {/* Tags (optional) */}
                <div>
                  <TagInput tags={tags} onChange={setTags} />
                </div>

                {/* Content (mandatory) */}
                <div className="min-h-[120px]">
                  <RichEditor
                    content={content}
                    onChange={(html, text) => { setContent(html); setPlainText(text); }}
                    placeholder="Paste your snippet..."
                  />
                </div>
              </div>

              {/* Fixed Footer — Save Button */}
              <div className="shrink-0 border-t border-[var(--vault-border)] px-4 py-3">
                <button
                  onClick={handleSave}
                  disabled={isContentEmpty || isCreating}
                  className="vault-btn-primary w-full disabled:opacity-50 !py-2.5"
                >
                  {isCreating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Add Snippet</>
                  )}
                </button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
