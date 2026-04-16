'use client';

import { useVault } from '@/lib/vault/store';
import { Search, X } from 'lucide-react';

export default function SearchBar() {
  const { state, dispatch } = useVault();

  return (
    <div className="relative flex-1 w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vault-muted)]" />
      <input
        id="vault-search"
        type="text"
        placeholder="Search vault..."
        value={state.searchQuery}
        onChange={(e) => dispatch({ type: 'SET_SEARCH', query: e.target.value })}
        className="h-9 w-full rounded-lg border border-[var(--vault-border)] bg-[var(--vault-glass)] pl-9 pr-8 text-sm text-[var(--vault-text)] placeholder:text-[var(--vault-muted)] focus:border-[var(--vault-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--vault-gold)] transition-colors"
      />
      {state.searchQuery && (
        <button
          onClick={() => dispatch({ type: 'SET_SEARCH', query: '' })}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
