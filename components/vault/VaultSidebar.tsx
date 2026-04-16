'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import VaultItemRow from './VaultItemRow';
import { Lock } from 'lucide-react';
import { SignIn, useUser } from '@clerk/nextjs';

export default function VaultSidebar() {
  const { state } = useVault();
  const { isLoaded, isSignedIn } = useUser();

  const privateItems = useMemo(() => {
    const items = state.items.filter(i => i.visibility === 'private');
    if (!state.searchQuery) return items;
    const q = state.searchQuery.toLowerCase();
    return items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.plainText.toLowerCase().includes(q) ||
      i.tags.some(t => t.label.toLowerCase().includes(q)) ||
      (i.username && i.username.toLowerCase().includes(q)) ||
      (i.siteUrl && i.siteUrl.toLowerCase().includes(q))
    );
  }, [state.items, state.searchQuery]);

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
    <motion.div
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--vault-text)]">
          <Lock className="h-3.5 w-3.5 text-[var(--vault-gold)]" />
          My Vault
          <span className="text-xs font-normal text-[var(--vault-muted)]">
            {privateItems.length} items
          </span>
        </h2>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {privateItems.map((item, i) => (
            <VaultItemRow key={item.id} item={item} index={i} />
          ))}
        </AnimatePresence>

        {privateItems.length === 0 && (
          <div className="py-8 text-center text-xs text-[var(--vault-muted)]">
            {state.searchQuery ? 'No matching vault items' : 'Your vault is empty'}
          </div>
        )}
      </div>
    </motion.div>
  );
}
