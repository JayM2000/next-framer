'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useVault } from '@/lib/vault/store';
import { Plus, Clipboard, Loader2 } from 'lucide-react';
import type { VaultItem } from '@/lib/vault/types';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

export default function QuickAdd() {
  const { dispatch, showToast, isCreating } = useVault();
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [title, setTitle] = useState('');

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
      title: title.trim() || 'Quick Snippet',
      content,
      plainText,
      tags: [],
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
    </div>
  );
}

