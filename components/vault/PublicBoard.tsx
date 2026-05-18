'use client';

import { useState, useMemo, useCallback, useRef, memo, useEffect, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import ItemCard from './ItemCard';
import ItemDetailModal from './ItemDetailModal';
import EditItemModal from './EditItemModal';
import {
  Inbox, Loader2, Flame, FileText, KeyRound, Clipboard,
  Sparkles, Clock, Link2, User, ListFilter, Star, Tag, RefreshCw
} from 'lucide-react';
import type { VaultItem } from '@/lib/vault/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@clerk/nextjs';
import { trpc } from '@/trpc/client';

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

// ── Skeleton Card Component ───────────────────────────────
function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="relative flex flex-col rounded-xl border border-[var(--vault-border)] overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(100,100,120,0.06), rgba(100,100,120,0.02))' }}
    >
      {/* Animated shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[var(--vault-text)]/[0.04] to-transparent" />

      {/* Header skeleton */}
      <div className="flex items-start gap-2.5 p-4 pb-2">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-[var(--vault-text)]/[0.06]" />
        <div className="min-w-0 flex-1 space-y-2 pr-8">
          <div className="h-4 w-3/5 rounded-md bg-[var(--vault-text)]/[0.07]" />
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 rounded bg-[var(--vault-text)]/[0.05]" />
            <div className="h-3 w-14 rounded-sm bg-[var(--vault-text)]/[0.05]" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 space-y-1.5 px-4 pb-3">
        <div className="h-3 w-full rounded bg-[var(--vault-text)]/[0.05]" />
        <div className="h-3 w-5/6 rounded bg-[var(--vault-text)]/[0.04]" />
        <div className="h-3 w-2/3 rounded bg-[var(--vault-text)]/[0.03]" />
      </div>

      {/* Tags skeleton */}
      <div className="flex gap-1.5 px-4 pb-2">
        <div className="h-4 w-12 rounded-md bg-[var(--vault-text)]/[0.05]" />
        <div className="h-4 w-16 rounded-md bg-[var(--vault-text)]/[0.04]" />
      </div>

      {/* Action bar skeleton */}
      <div className="flex items-center gap-2 border-t border-[var(--vault-border)] px-3 py-2.5">
        <div className="h-5 w-14 rounded-lg bg-[var(--vault-text)]/[0.05]" />
        <div className="h-5 w-12 rounded-lg bg-[var(--vault-text)]/[0.04]" />
        <div className="ml-auto h-5 w-16 rounded-lg bg-[var(--vault-text)]/[0.04]" />
      </div>
    </motion.div>
  );
}

// ── Skeleton Grid ─────────────────────────────────────────
function SkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div className="px-[11px] pt-[10px]">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── Card Grid Component ───────────────────────────────────
const CardGrid = memo(function CardGrid({
  items,
  indexOffset,
  onItemClick,
  onStatsClick,
  onEdit,
  performanceMode = false,
}: {
  items: VaultItem[];
  indexOffset: number;
  onItemClick: (item: VaultItem) => void;
  onStatsClick: (item: VaultItem) => void;
  onEdit: (item: VaultItem) => void;
  performanceMode?: boolean;
}) {
  return (
    <div
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
    >
      {items.map((item, i) => (
        <ItemCard
          key={item.id}
          item={item}
          index={indexOffset + i}
          onClick={() => onItemClick(item)}
          onStatsClick={() => onStatsClick(item)}
          onEdit={() => onEdit(item)}
          performanceMode={performanceMode}
        />
      ))}
    </div>
  );
});

// ══════════════════════════════════════════════════════════
//  PUBLIC BOARD
// ══════════════════════════════════════════════════════════

export default function PublicBoard() {
  const { isSignedIn } = useAuth();
  const { state, isLoading, isRefetching, currentDbUserId, fetchNextPublicPage, hasNextPublicPage, isFetchingNextPublicPage } = useVault();
  const utils = trpc.useUtils();
  const [selectedItem, setSelectedItem] = useState<{ item: VaultItem; initialTab?: 'rendered' | 'raw' | 'stats' } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerShadowRef = useRef<HTMLDivElement>(null);
  const isScrolledRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollViewStyle = useMemo(() => ({
    WebkitOverflowScrolling: 'touch',
    scrollbarGutter: 'stable',
    overscrollBehavior: 'contain',
  }) as CSSProperties, []);

  // Filter state
  const [filterMyItems, setFilterMyItems] = useState(false);
  const [filterImportant, setFilterImportant] = useState(false);
  const [filterHasLinks, setFilterHasLinks] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'oldest'>('trending');

  // Filter scroll state
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkFilterScroll = useCallback(() => {
    if (filterScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filterScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      // Use a 1px tolerance for rounding issues
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    checkFilterScroll();
    window.addEventListener('resize', checkFilterScroll);
    return () => window.removeEventListener('resize', checkFilterScroll);
  }, [checkFilterScroll]);

  // Re-check when auth or tags load which might change the scroll width
  useEffect(() => {
    checkFilterScroll();
  }, [checkFilterScroll, isSignedIn]);

  // Fetch tags for dropdown
  const { data: availableTags = [] } = trpc.vault.getAllTags.useQuery(undefined, {
    staleTime: 60 * 1000, // 1 min — tags don't change often
  });

  const updateScrollShadow = useCallback(() => {
    scrollRafRef.current = null;
    const nextIsScrolled = (scrollRef.current?.scrollTop ?? 0) > 4;
    if (isScrolledRef.current === nextIsScrolled) return;

    isScrolledRef.current = nextIsScrolled;
    if (headerShadowRef.current) {
      headerShadowRef.current.style.opacity = nextIsScrolled ? '1' : '0';
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = window.requestAnimationFrame(updateScrollShadow);
  }, [updateScrollShadow]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);

  // ── Infinite scroll: IntersectionObserver ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPublicPage && !isFetchingNextPublicPage) {
          fetchNextPublicPage();
        }
      },
      { root, rootMargin: '600px 0px' } // trigger before reaching the bottom of the scroll container
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPublicPage, isFetchingNextPublicPage, fetchNextPublicPage]);

  // Clear auth-dependent filters immediately on sign-out
  useEffect(() => {
    if (!isSignedIn) {
      setFilterMyItems(false);
      setFilterImportant(false);
    }
  }, [isSignedIn]);

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

    if (state.selectedTags && state.selectedTags.length > 0) {
      items = items.filter(i =>
        state.selectedTags.every(tag => i.tags.some(t => t.label === tag))
      );
    }

    if (filterMyItems && currentDbUserId) {
      items = items.filter(i => i.userId === currentDbUserId);
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

    return items;
  }, [state.items, state.searchQuery, state.activeCategory, state.selectedTags, filterMyItems, filterImportant, filterHasLinks, filterTag, currentDbUserId]);

  // ── Build sections ──
  const isFiltered = state.activeCategory !== 'all' || !!state.searchQuery || (state.selectedTags && state.selectedTags.length > 0) || filterMyItems || filterImportant || filterHasLinks || filterTag !== 'all' || sortBy !== 'trending';

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
    const items = [...filteredItems];
    if (sortBy === 'trending') {
      return items.sort((a, b) => (b.copyCount ?? 0) - (a.copyCount ?? 0));
    } else if (sortBy === 'newest') {
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  }, [filteredItems, isFiltered, sortBy]);

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


  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header — fixed, never scrolls */}
      <div className="shrink-0 mb-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-y-3 pb-2 pt-2 pl-[6px] pr-[5px] md:pl-[8px] md:pr-[10px] lg:px-[18px] relative z-10">
        {/* Scroll shadow constrained to central 80% */}
        <div
          ref={headerShadowRef}
          className="absolute bottom-0 left-[1%] right-[1%] h-full pointer-events-none transition-opacity duration-300 rounded-3xl"
          style={{
            boxShadow: '0 6px 8px -6px var(--vault-scroll-shadow)',
            opacity: 0
          }}
        />
        
        {/* Title Section */}
        <h2 className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--vault-text)] mr-2">
          <Sparkles className="h-4 w-4 text-[var(--vault-gold)]" />
          {boardTitle}
          <span className="text-xs font-normal text-[var(--vault-muted)]">
            {totalCount} items
          </span>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              const el = document.getElementById('pb-reload-icon');
              if (el) { el.style.transition = 'transform 0.6s cubic-bezier(0.4,0,0.2,1)'; el.style.transform = 'rotate(360deg)'; setTimeout(() => { el.style.transition = 'none'; el.style.transform = 'rotate(0deg)'; }, 620); }
              utils.vault.getPublicItemsPaginated.invalidate();
              utils.vault.getItems.invalidate();
            }}
            className="relative flex h-6 w-6 items-center justify-center rounded-lg border border-transparent hover:border-[var(--vault-gold)]/30 hover:bg-[var(--vault-gold)]/10 transition-all duration-200 cursor-pointer group"
            title="Reload board"
          >
            <RefreshCw
              id="pb-reload-icon"
              className={`h-3.5 w-3.5 text-[var(--vault-muted)] group-hover:text-[var(--vault-gold)] transition-colors duration-200 ${isRefetching ? 'animate-spin text-[var(--vault-gold)]' : ''}`}
            />
            {/* Glow ring on hover */}
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 12px -2px rgba(201,168,76,0.25)' }} />
          </motion.button>
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

        {/* Custom Filters (Scrollable on mobile, Right-aligned on desktop) */}
        <div className="relative w-full md:w-auto flex items-center min-w-0">
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-1 w-6 bg-gradient-to-r from-black/15 dark:from-white/15 to-transparent pointer-events-none z-30" />
          )}
          
          <div 
            ref={filterScrollRef}
            onScroll={checkFilterScroll}
            className="flex items-center gap-2 w-full overflow-x-auto no-scrollbar pb-1 md:pb-0 z-20"
          >
            {isSignedIn && currentDbUserId && (
              <>
                <button
                  onClick={() => { setFilterMyItems(p => !p); setTimeout(checkFilterScroll, 50); }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border h-7 px-3 text-xs font-medium transition-all ${
                    filterMyItems
                      ? 'border-[var(--vault-gold)]/50 bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                      : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-[var(--vault-gold)]/30 hover:text-[var(--vault-text)]'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  My Items
                </button>
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
              </>
            )}
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

      {/* Scrollable content area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-[11px] pt-[10px]" style={scrollViewStyle}>
        {/* Skeleton loading — initial load / hard refresh only */}
        {isLoading ? (
          <SkeletonGrid count={9} />
        ) : totalCount === 0 ? (
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
                          performanceMode
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
                performanceMode
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
                  items={[...filteredItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
                  indexOffset={0}
                  onItemClick={handleItemClick}
                  onStatsClick={handleStatsClick}
                  onEdit={handleEditFromCard}
                  performanceMode
                />
              </>
            )}
          </div>
        )}

            {/* ── Infinite Scroll Sentinel + States ── */}
            {!isLoading && totalCount > 0 && (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 pb-8">
                {/* Sentinel element — observed by IntersectionObserver */}
                <div ref={sentinelRef} className="h-1 w-full" />

                {/* Loading spinner while fetching next page */}
                {isFetchingNextPublicPage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-full border border-[var(--vault-border)] bg-[var(--vault-panel)] px-5 py-2.5 backdrop-blur-md"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--vault-gold)]" />
                    <span className="text-xs font-medium text-[var(--vault-muted)]">Loading more items...</span>
                  </motion.div>
                )}

                {/* End of feed message */}
                {!hasNextPublicPage && !isFetchingNextPublicPage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center gap-2 py-4"
                  >
                    <div className="flex items-center gap-2 rounded-full border border-[var(--vault-border)] bg-[var(--vault-panel)]/80 px-5 py-2 backdrop-blur-md">
                      <Sparkles className="h-3.5 w-3.5 text-[var(--vault-gold)]" />
                      <span className="text-xs font-medium text-[var(--vault-muted)]">You&apos;ve reached the end</span>
                    </div>
                    <span className="text-[10px] text-[var(--vault-muted)]/60">
                      {totalCount} {totalCount === 1 ? 'item' : 'items'} total
                    </span>
                  </motion.div>
                )}
              </div>
            )}
      </div>

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
