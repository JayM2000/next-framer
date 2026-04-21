'use client';

import { useState, useRef, useEffect } from 'react';
import { useVault } from '@/lib/vault/store';
import { trpc } from '@/trpc/client';
import { Search, X, Tag } from 'lucide-react';

export default function SearchBar() {
  const { state, dispatch } = useVault();
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all available tags
  const { data: availableTags = [] } = trpc.vault.getAllTags.useQuery();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tagLabel: string) => {
    const currentTags = state.selectedTags || [];
    const newTags = currentTags.includes(tagLabel)
      ? currentTags.filter(t => t !== tagLabel)
      : [...currentTags, tagLabel];
    
    dispatch({ type: 'SET_SELECTED_TAGS', tags: newTags });
  };

  const removeTag = (tagLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTags = (state.selectedTags || []).filter(t => t !== tagLabel);
    dispatch({ type: 'SET_SELECTED_TAGS', tags: newTags });
  };

  const clearAll = () => {
    dispatch({ type: 'SET_SEARCH', query: '' });
    dispatch({ type: 'SET_SELECTED_TAGS', tags: [] });
  };

  const hasSearch = state.searchQuery || (state.selectedTags && state.selectedTags.length > 0);

  return (
    <div className="relative flex-1 w-full max-w-md" ref={containerRef}>
      <div className={`relative flex items-center min-h-[36px] w-full flex-wrap gap-1.5 rounded-lg border bg-[var(--vault-glass)] pl-3 pr-8 py-1 transition-colors ${
        isFocused ? 'border-[var(--vault-gold)] ring-1 ring-[var(--vault-gold)]' : 'border-[var(--vault-border)]'
      }`}>
        <Search className="h-4 w-4 shrink-0 text-[var(--vault-muted)]" />
        
        {/* Selected Tags Pills */}
        {state.selectedTags?.map(tagLabel => {
          const tagInfo = availableTags.find(t => t.label === tagLabel);
          const color = tagInfo?.color || '#8b5cf6';
          return (
            <span
              key={tagLabel}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium shrink-0"
              style={{ backgroundColor: color + '30', color: color, border: `1px solid ${color}40` }}
            >
              {tagLabel}
              <button
                type="button"
                onClick={(e) => removeTag(tagLabel, e)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        <input
          id="vault-search"
          type="text"
          placeholder={state.selectedTags?.length ? "" : "Search vault..."}
          value={state.searchQuery}
          onChange={(e) => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
          onFocus={() => setIsFocused(true)}
          className="flex-1 min-w-[60px] bg-transparent text-sm text-[var(--vault-text)] placeholder:text-[var(--vault-muted)] outline-none ring-0 border-none shadow-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none !outline-none !ring-0 !border-none"
        />
      </div>

      {hasSearch && (
        <button
          onClick={clearAll}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Tags Dropdown */}
      {isFocused && availableTags.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-[var(--vault-border)] bg-[var(--vault-panel)] p-2 shadow-xl backdrop-blur-xl">
          <div className="mb-2 px-1 text-xs font-semibold text-[var(--vault-muted)] flex items-center gap-1.5">
            <Tag className="h-3 w-3" /> Filter by tags
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
            {availableTags.map((tag) => {
              const isSelected = state.selectedTags?.includes(tag.label);
              return (
                <button
                  key={tag.label}
                  onClick={() => toggleTag(tag.label)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all"
                  style={{ 
                    backgroundColor: isSelected ? tag.color + '40' : 'transparent',
                    color: isSelected ? tag.color : 'var(--vault-text)',
                    border: `1px solid ${isSelected ? tag.color + '60' : 'var(--vault-border)'}`
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.label}
                  <span className="opacity-50 ml-1 text-[10px]">
                    ({tag.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
