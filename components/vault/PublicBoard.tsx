'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import ItemCard from './ItemCard';
import ItemDetailModal from './ItemDetailModal';
import EditItemModal from './EditItemModal';
import { Inbox, Loader2 } from 'lucide-react';
import type { VaultItem } from '@/lib/vault/types';

export default function PublicBoard() {
  const { state, isLoading, isRefetching } = useVault();
  const [selectedItem, setSelectedItem] = useState<{ item: VaultItem; initialTab?: 'rendered' | 'raw' | 'stats' } | null>(null);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);

  const publicItems = useMemo(() => {
    let items = state.items.filter(i => i.visibility === 'public');
    
    if (state.activeCategory === 'passwords') items = items.filter(i => i.type === 'password');
    if (state.activeCategory === 'notes') items = items.filter(i => i.type === 'note');
    if (state.activeCategory === 'clipboard') items = items.filter(i => i.type === 'clipboard');
    if (state.activeCategory === 'trash') items = [];

    if (!state.searchQuery) return items;
    const q = state.searchQuery.toLowerCase();
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.plainText.toLowerCase().includes(q) ||
      i.tags.some(t => t.label.toLowerCase().includes(q))
    );
  }, [state.items, state.searchQuery, state.activeCategory]);

  const boardTitle = useMemo(() => {
    switch (state.activeCategory) {
      case 'passwords': return 'Passwords';
      case 'notes': return 'Secure Notes';
      case 'clipboard': return 'Clipboard Snippets';
      case 'trash': return 'Trash';
      default: return 'Public Board';
    }
  }, [state.activeCategory]);

  const handleEditFromDetail = (item: VaultItem) => {
    setSelectedItem(null);
    // Small delay to let the detail modal exit animation complete
    setTimeout(() => setEditingItem(item), 200);
  };

  const handleEditFromCard = (item: VaultItem) => {
    setEditingItem(item);
  };

  return (
    <div className="flex-1">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--vault-text)]">
          {boardTitle}
          <span className="text-xs font-normal text-[var(--vault-muted)]">
            {publicItems.length} items
          </span>
          {isRefetching && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--vault-gold)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--vault-gold)]"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating
            </motion.span>
          )}
        </h2>
      </div>

      {publicItems.length === 0 && !isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-[var(--vault-muted)]"
        >
          <Inbox className="mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">No items found</p>
          <p className="text-xs">
            {state.searchQuery ? 'Try a different search query' : 'Create your first item!'}
          </p>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Spinner overlay — shown during loading or refetching */}
          {(isLoading || isRefetching) && (
            <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-[var(--vault-panel)]/80 px-4 py-2 shadow-xl backdrop-blur-sm border border-[var(--vault-border)]">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--vault-gold)]" />
                <span className="text-xs font-medium text-[var(--vault-gold)]">
                  {isLoading ? 'Loading...' : 'Updating...'}
                </span>
              </div>
            </div>
          )}

          {/* Cards grid — lower opacity when loading/refetching */}
          <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 transition-opacity duration-300 ${(isLoading || isRefetching) ? 'opacity-30' : 'opacity-100'}`}>
            <AnimatePresence mode="popLayout">
              {publicItems.map((item, i) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={i}
                  onClick={() => setSelectedItem({ item })}
                  onStatsClick={() => setSelectedItem({ item, initialTab: 'stats' })}
                  onEdit={() => handleEditFromCard(item)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ItemDetailModal
        item={selectedItem ? selectedItem.item : null}
        initialTab={selectedItem ? selectedItem.initialTab : undefined}
        onClose={() => setSelectedItem(null)}
        onEdit={handleEditFromDetail}
      />

      {/* Edit Modal */}
      <EditItemModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
      />
    </div>
  );
}

