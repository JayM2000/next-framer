'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import VaultItemRow from './VaultItemRow';
import EditItemModal from './EditItemModal';
import ItemDetailModal from './ItemDetailModal';
import { Lock, Star, Link2, ListFilter, Tag } from 'lucide-react';
import { SignIn, useUser } from '@clerk/nextjs';
import type { VaultItem } from '@/lib/vault/types';
import { trpc } from '@/trpc/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function VaultSidebar() {
  const { state } = useVault();
  const { isLoaded, isSignedIn } = useUser();
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: VaultItem; initialTab?: 'rendered' | 'raw' | 'stats' } | null>(null);

  const [filterImportant, setFilterImportant] = useState(false);
  const [filterHasLinks, setFilterHasLinks] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'oldest'>('newest');

  const filterScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setIsScrolled(scrollRef.current.scrollTop > 4);
    }
  }, []);

  const checkFilterScroll = useCallback(() => {
    if (filterScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filterScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    checkFilterScroll();
    window.addEventListener('resize', checkFilterScroll);
    return () => window.removeEventListener('resize', checkFilterScroll);
  }, [checkFilterScroll]);

  const { data: availableTags = [] } = trpc.vault.getAllTags.useQuery();

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

    if (filterImportant) {
      items = items.filter(i => i.isImportant);
    }

    if (filterHasLinks) {
      items = items.filter(i => i.extractedUrls && i.extractedUrls.length > 0);
    }

    if (filterTag !== 'all') {
      items = items.filter(i => i.tags.some(t => t.label === filterTag));
    }

    if (sortBy === 'trending') {
      items.sort((a, b) => (b.copyCount ?? 0) - (a.copyCount ?? 0));
    } else if (sortBy === 'newest') {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'oldest') {
      items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return items;
  }, [state.items, state.searchQuery, state.activeCategory, state.selectedTags, filterImportant, filterHasLinks, filterTag, sortBy]);

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
        className="flex flex-col flex-1 min-h-0"
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="shrink-0 mb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-y-3 pb-2 pt-2 pl-[6px] pr-[5px] md:pl-[8px] md:pr-[10px] lg:px-[18px] relative z-10">
          <div
            className="absolute bottom-0 left-[1%] right-[1%] h-full pointer-events-none transition-opacity duration-300 rounded-3xl"
            style={{
              boxShadow: '0 6px 8px -6px var(--vault-scroll-shadow)',
              opacity: isScrolled ? 1 : 0
            }}
          />
          <h2 className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--vault-text)] mr-2">
            {state.activeCategory === 'trash' ? (
              <>Trash</>
            ) : (
              <><Lock className="h-3.5 w-3.5 text-[var(--vault-gold)]" /> My Vault</>
            )}
            <span className="text-xs font-normal text-[var(--vault-muted)]">
              {displayedItems.length} items
            </span>
          </h2>

          <div className="relative w-full md:w-auto flex items-center min-w-0">
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-1 w-6 bg-gradient-to-r from-black/15 dark:from-white/15 to-transparent pointer-events-none z-30" />
            )}
            
            <div 
              ref={filterScrollRef}
              onScroll={checkFilterScroll}
              className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar pb-1 md:pb-0 z-20"
            >
              <button
                onClick={() => { setFilterImportant(p => !p); setTimeout(checkFilterScroll, 50); }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border h-7 px-3 text-xs font-medium transition-all ${
                  filterImportant
                    ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                    : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-yellow-500/30 hover:text-[var(--vault-text)]'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${filterImportant ? 'fill-current' : ''}`} />
                Important
              </button>
              
              <button
                onClick={() => { setFilterHasLinks(p => !p); setTimeout(checkFilterScroll, 50); }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border h-7 px-3 text-xs font-medium transition-all ${
                  filterHasLinks
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-emerald-500/30 hover:text-[var(--vault-text)]'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Has Links
              </button>
              
              <div className="flex shrink-0 items-center rounded-full border border-[var(--vault-border)] bg-[var(--vault-panel)] h-7 pl-2.5 pr-1">
                <ListFilter className="mr-1 h-3.5 w-3.5 text-[var(--vault-muted)]" />
                <Select value={sortBy} onValueChange={(value) => { setSortBy(value as 'trending' | 'newest' | 'oldest'); setTimeout(checkFilterScroll, 50); }}>
                  <SelectTrigger className="h-full border-0 bg-transparent px-1.5 py-0 text-xs font-medium text-[var(--vault-text)] shadow-none focus:ring-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trending" className="text-xs">Trending</SelectItem>
                    <SelectItem value="newest" className="text-xs">Newest</SelectItem>
                    <SelectItem value="oldest" className="text-xs">Oldest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex shrink-0 items-center rounded-full border border-[var(--vault-border)] bg-[var(--vault-panel)] h-7 pl-2.5 pr-1">
                <Tag className="mr-1 h-3.5 w-3.5 text-[var(--vault-muted)]" />
                <Select value={filterTag} onValueChange={(value) => { setFilterTag(value); setTimeout(checkFilterScroll, 50); }}>
                  <SelectTrigger className="h-full border-0 bg-transparent px-1.5 py-0 text-xs font-medium text-[var(--vault-text)] shadow-none focus:ring-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Tags</SelectItem>
                    {availableTags.map((tag, idx) => (
                      <SelectItem key={`${tag.label}-${idx}`} value={tag.label} className="text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-1 w-6 bg-gradient-to-l from-black/15 dark:from-white/15 to-transparent pointer-events-none z-30" />
            )}
          </div>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-[11px] pt-[10px] space-y-3 pb-6">
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
