'use client';

import { useVault } from '@/lib/vault/store';
import { Home, Lock, Plus } from 'lucide-react';

export default function MobileNav() {
  const { state, dispatch } = useVault();

  const tabs = [
    { id: 'dashboard' as const, icon: Home, label: 'Board' },
    { id: 'vault' as const, icon: Lock, label: 'Vault' },
    { id: 'create' as const, icon: Plus, label: 'New' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--vault-border)] bg-[var(--vault-panel)]/90 backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              if (id === 'create') {
                dispatch({ type: 'SET_DRAWER', open: true });
              } else {
                dispatch({ type: 'SET_TAB', tab: id });
              }
            }}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium transition-colors ${
              state.activeTab === id
                ? 'text-[var(--vault-gold)]'
                : 'text-[var(--vault-muted)]'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
