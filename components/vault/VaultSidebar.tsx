'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import VaultItemRow from './VaultItemRow';
import EditItemModal from './EditItemModal';
import ItemDetailModal from './ItemDetailModal';
import { Lock } from 'lucide-react';
import { SignIn, useUser } from '@clerk/nextjs';
import type { VaultItem } from '@/lib/vault/types';

export default function VaultSidebar() {
  const { state } = useVault();
  const { isLoaded, isSignedIn } = useUser();
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: VaultItem; initialTab?: 'rendered' | 'raw' | 'stats' } | null>(null);

  const displayedItems = useMemo(() => {
    let items = state.items;
    
    if (state.activeCategory === 'trash') {
      items = items.filter(i => i.isDeleted);
    } else {
      items = items.filter(i => i.visibility === 'private' && !i.isDeleted);
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.plainText.toLowerCase().includes(q) ||
        i.tags.some(t => t.label.toLowerCase().includes(q)) ||
        (i.username && i.username.toLowerCase().includes(q)) ||
        (i.siteUrl && i.siteUrl.toLowerCase().includes(q))
      );
    }

    if (state.selectedTags && state.selectedTags.length > 0) {
      items = items.filter(i =>
        state.selectedTags.every(tag => i.tags.some(t => t.label === tag))
      );
    }

    return items;
  }, [state.items, state.searchQuery, state.activeCategory, state.selectedTags]);

  const handleEditFromDetail = (item: VaultItem) => {
    setSelectedItem(null);
    // Small delay to let the detail modal exit animation complete
    setTimeout(() => setEditingItem(item), 200);
  };

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex mt-8 justify-center"
      >
        <SignIn routing="hash" />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--vault-text)]">
            {state.activeCategory === 'trash' ? (
              <>Trash</>
            ) : (
              <><Lock className="h-3.5 w-3.5 text-[var(--vault-gold)]" /> My Vault</>
            )}
            <span className="text-xs font-normal text-[var(--vault-muted)]">
              {displayedItems.length} items
            </span>
          </h2>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayedItems.map((item, i) => (
              <VaultItemRow
                key={item.id}
                item={item}
                index={i}
                onClick={() => setSelectedItem({ item })}
                onEdit={(item) => setEditingItem(item)}
              />
            ))}
          </AnimatePresence>

          {displayedItems.length === 0 && (
            <div className="py-8 text-center text-xs text-[var(--vault-muted)]">
              {state.searchQuery ? 'No matching items' : (state.activeCategory === 'trash' ? 'Trash is empty' : 'Your vault is empty')}
            </div>
          )}
        </div>
      </motion.div>

      {/* Detail Modal — same modal as public board */}
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
    </>
  );
}
