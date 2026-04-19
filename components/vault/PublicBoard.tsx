'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import ItemCard from './ItemCard';
import ItemDetailModal from './ItemDetailModal';
import EditItemModal from './EditItemModal';
import {
  Inbox, Loader2, Flame, FileText, KeyRound, Clipboard,
  Sparkles, Clock,
} from 'lucide-react';
import type { VaultItem } from '@/lib/vault/types';

// ── Section config ────────────────────────────────────────
interface Section {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Flame;
  accentColor: string;
  accentBg: string;
  glowColor: string;
  items: VaultItem[];
}

// ── Section Divider Component ─────────────────────────────
function SectionDivider({
  title,
  subtitle,
  icon: Icon,
  accentColor,
  accentBg,
  glowColor,
  count,
  index,
}: {
  title: string;
  subtitle: string;
  icon: typeof Flame;
  accentColor: string;
  accentBg: string;
  glowColor: string;
  count: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="relative mb-5 mt-2"
    >
      {/* Gradient line */}
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2">
        <div
          className="h-full w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}40, ${accentColor}20, transparent)`,
          }}
        />
      </div>

      {/* Label pill */}
      <div className="relative flex items-center justify-center">
        <motion.div
          whileHover={{ scale: 1.03, y: -1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2.5 rounded-full border px-4 py-1.5 backdrop-blur-md"
          style={{
            background: `linear-gradient(135deg, ${accentBg}, var(--vault-panel))`,
            borderColor: `${accentColor}30`,
            boxShadow: `0 2px 16px -4px ${glowColor}`,
          }}
        >
          {/* Icon circle */}
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <Icon className="h-3 w-3" style={{ color: accentColor }} />
          </div>

          {/* Title */}
          <span
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: accentColor }}
          >
            {title}
          </span>

          {/* Separator dot */}
          <span
            className="h-1 w-1 rounded-full"
            style={{ backgroundColor: `${accentColor}50` }}
          />

          {/* Subtitle */}
          <span className="text-[10px] font-medium text-[var(--vault-muted)]">
            {subtitle}
          </span>

          {/* Count badge */}
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
            }}
          >
            {count}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Card Grid Component ───────────────────────────────────
const CardGrid = memo(function CardGrid({
  items,
  indexOffset,
  onItemClick,
  onStatsClick,
  onEdit,
  dimmed,
}: {
  items: VaultItem[];
  indexOffset: number;
  onItemClick: (item: VaultItem) => void;
  onStatsClick: (item: VaultItem) => void;
  onEdit: (item: VaultItem) => void;
  dimmed: boolean;
}) {
  return (
    <div
      className={`grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 transition-opacity duration-300 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            index={indexOffset + i}
            onClick={() => onItemClick(item)}
            onStatsClick={() => onStatsClick(item)}
            onEdit={() => onEdit(item)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

// ══════════════════════════════════════════════════════════
//  PUBLIC BOARD
// ══════════════════════════════════════════════════════════

export default function PublicBoard() {
  const { state, isLoading, isRefetching } = useVault();
  const [selectedItem, setSelectedItem] = useState<{ item: VaultItem; initialTab?: 'rendered' | 'raw' | 'stats' } | null>(null);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);

  // ── Build filtered base list ──
  const filteredItems = useMemo(() => {
    let items = state.items.filter(i => i.visibility === 'public' && !i.isDeleted);

    if (state.activeCategory === 'passwords') items = items.filter(i => i.type === 'password');
    if (state.activeCategory === 'notes') items = items.filter(i => i.type === 'note');
    if (state.activeCategory === 'clipboard') items = items.filter(i => i.type === 'clipboard');
    if (state.activeCategory === 'trash') items = [];

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.plainText.toLowerCase().includes(q) ||
        i.tags.some(t => t.label.toLowerCase().includes(q))
      );
    }

    return items;
  }, [state.items, state.searchQuery, state.activeCategory]);

  // ── Build sections ──
  const isFiltered = state.activeCategory !== 'all' || !!state.searchQuery;

  const sections: Section[] = useMemo(() => {
    if (isFiltered) {
      // When filtering by category or searching, show a flat sorted list (no sections)
      return [];
    }

    // 🔥 Trending — items with copy count > 0
    const trending = filteredItems
      .filter(i => (i.copyCount ?? 0) > 0)
      .sort((a, b) => (b.copyCount ?? 0) - (a.copyCount ?? 0));

    // 📝 Notes
    const notes = filteredItems
      .filter(i => i.type === 'note' && (i.copyCount ?? 0) === 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 🔑 Passwords
    const passwords = filteredItems
      .filter(i => i.type === 'password' && (i.copyCount ?? 0) === 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 📋 Clipboard Snippets
    const clipboard = filteredItems
      .filter(i => i.type === 'clipboard' && (i.copyCount ?? 0) === 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const result: Section[] = [];

    if (trending.length > 0) {
      result.push({
        id: 'trending',
        title: 'Trending',
        subtitle: 'Most copied items',
        icon: Flame,
        accentColor: '#f97316',
        accentBg: 'rgba(249,115,22,0.06)',
        glowColor: 'rgba(249,115,22,0.15)',
        items: trending,
      });
    }

    if (notes.length > 0) {
      result.push({
        id: 'notes',
        title: 'Notes',
        subtitle: 'Secure notes & documents',
        icon: FileText,
        accentColor: '#a78bfa',
        accentBg: 'rgba(167,139,250,0.06)',
        glowColor: 'rgba(167,139,250,0.15)',
        items: notes,
      });
    }

    if (passwords.length > 0) {
      result.push({
        id: 'passwords',
        title: 'Passwords',
        subtitle: 'Saved credentials',
        icon: KeyRound,
        accentColor: '#c9a84c',
        accentBg: 'rgba(201,168,76,0.06)',
        glowColor: 'rgba(201,168,76,0.15)',
        items: passwords,
      });
    }

    if (clipboard.length > 0) {
      result.push({
        id: 'clipboard',
        title: 'Snippets',
        subtitle: 'Clipboard clippings',
        icon: Clipboard,
        accentColor: '#06b6d4',
        accentBg: 'rgba(6,182,212,0.06)',
        glowColor: 'rgba(6,182,212,0.15)',
        items: clipboard,
      });
    }

    return result;
  }, [filteredItems, isFiltered]);

  // Flat list for filtered view
  const flatSortedItems = useMemo(() => {
    if (!isFiltered) return [];
    return [...filteredItems].sort((a, b) => (b.copyCount ?? 0) - (a.copyCount ?? 0));
  }, [filteredItems, isFiltered]);

  const totalCount = filteredItems.length;

  const boardTitle = useMemo(() => {
    switch (state.activeCategory) {
      case 'passwords': return 'Passwords';
      case 'notes': return 'Secure Notes';
      case 'clipboard': return 'Clipboard Snippets';
      case 'trash': return 'Trash';
      default: return 'Public Board';
    }
  }, [state.activeCategory]);

  const handleEditFromDetail = useCallback((item: VaultItem) => {
    setSelectedItem(null);
    // Small delay to let the detail modal exit animation complete
    setTimeout(() => setEditingItem(item), 200);
  }, []);

  const handleEditFromCard = useCallback((item: VaultItem) => {
    setEditingItem(item);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingItem(null);
  }, []);

  const handleItemClick = useCallback((item: VaultItem) => {
    setSelectedItem({ item });
  }, []);

  const handleStatsClick = useCallback((item: VaultItem) => {
    setSelectedItem({ item, initialTab: 'stats' });
  }, []);

  const dimmed = isLoading || isRefetching;

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--vault-text)]">
          <Sparkles className="h-4 w-4 text-[var(--vault-gold)]" />
          {boardTitle}
          <span className="text-xs font-normal text-[var(--vault-muted)]">
            {totalCount} items
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

      {/* Empty state */}
      {totalCount === 0 && !isLoading ? (
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
          {/* Spinner overlay */}
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

          {/* ── Sectioned View (default "all" category, no search) ── */}
          {!isFiltered && sections.length > 0 && (
            <div className="space-y-6">
              {sections.map((section, sectionIdx) => {
                // Calculate card index offset for stagger animation
                const offset = sections
                  .slice(0, sectionIdx)
                  .reduce((sum, s) => sum + s.items.length, 0);

                return (
                  <motion.section
                    key={section.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: sectionIdx * 0.1 }}
                  >
                    <SectionDivider
                      title={section.title}
                      subtitle={section.subtitle}
                      icon={section.icon}
                      accentColor={section.accentColor}
                      accentBg={section.accentBg}
                      glowColor={section.glowColor}
                      count={section.items.length}
                      index={sectionIdx}
                    />
                      <CardGrid
                        items={section.items}
                        indexOffset={offset}
                        onItemClick={handleItemClick}
                        onStatsClick={handleStatsClick}
                        onEdit={handleEditFromCard}
                        dimmed={dimmed}
                      />
                  </motion.section>
                );
              })}
            </div>
          )}

          {/* ── Flat View (filtered by category or search) ── */}
          {isFiltered && flatSortedItems.length > 0 && (
            <CardGrid
              items={flatSortedItems}
              indexOffset={0}
              onItemClick={handleItemClick}
              onStatsClick={handleStatsClick}
              onEdit={handleEditFromCard}
              dimmed={dimmed}
            />
          )}

          {/* ── Flat fallback when no sections exist (all items have 0 copies, same type, etc.) ── */}
          {!isFiltered && sections.length === 0 && totalCount > 0 && (
            <>
              <SectionDivider
                title="Recently Added"
                subtitle="Fresh items"
                icon={Clock}
                accentColor="#64748b"
                accentBg="rgba(100,116,139,0.06)"
                glowColor="rgba(100,116,139,0.10)"
                count={totalCount}
                index={0}
              />
              <CardGrid
                items={filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
                indexOffset={0}
                onItemClick={handleItemClick}
                onStatsClick={handleStatsClick}
                onEdit={handleEditFromCard}
                dimmed={dimmed}
              />
            </>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <ItemDetailModal
        item={selectedItem ? selectedItem.item : null}
        initialTab={selectedItem ? selectedItem.initialTab : undefined}
        onClose={handleCloseDetail}
        onEdit={handleEditFromDetail}
      />

      {/* Edit Modal */}
      <EditItemModal
        item={editingItem}
        onClose={handleCloseEdit}
      />
    </div>
  );
}
