'use client';

import { useVault } from '@/lib/vault/store';
import PublicBoard from './PublicBoard';
import QuickAdd from './QuickAdd';
import VaultSidebar from './VaultSidebar';
import { ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const { state, dispatch } = useVault();

  if (state.activeCategory === 'private') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
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
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Desktop: 70/30 split — Public Board + Quick Add */}
      <div className="hidden lg:flex gap-6">
        {/* Public Board — 70% */}
        <div className="w-[70%] min-w-0">
          <PublicBoard />
        </div>

        {/* Quick Add Panel — 30% */}
        <div className="w-[30%] min-w-0">
          <div className="sticky top-6">
            <QuickAdd />
          </div>
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
