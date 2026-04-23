'use client';

import { useVault } from '@/lib/vault/store';
import PublicBoard from './PublicBoard';
import QuickAdd from './QuickAdd';
import VaultSidebar from './VaultSidebar';
import { ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const { state, dispatch } = useVault();

  if (state.activeCategory === 'private' || state.activeCategory === 'trash') {
    return (
      <div className="w-full mx-auto max-w-4xl px-4 py-6 flex-1 overflow-y-auto min-h-0">
        <button 
          onClick={() => dispatch({ type: 'SET_CATEGORY', category: 'all' })}
          className="mb-8 flex w-fit items-center gap-2 rounded-lg py-2 pr-4 text-sm font-medium text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <VaultSidebar />
      </div>
    );
  }

  return (
    <div className="w-full mx-auto max-w-7xl px-4 py-6 flex flex-col flex-1 min-h-0">
      {/* Desktop: 70/30 split — Public Board + Quick Add */}
      <div className="hidden lg:flex gap-6 flex-1 min-h-0">
        {/* Public Board — 70% */}
        <div className="w-[70%] min-w-0 flex flex-col min-h-0">
          <PublicBoard />
        </div>

        {/* Quick Add Panel — 30% */}
        <div className="w-[30%] min-w-0 overflow-y-auto">
          <QuickAdd />
        </div>
      </div>

      {/* Mobile / Tablet: stacked layout */}
      <div className="block lg:hidden space-y-6">
        <QuickAdd />
        <PublicBoard />
      </div>
    </div>
  );
}
