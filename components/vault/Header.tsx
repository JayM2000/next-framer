'use client';

import { useState } from 'react';
import { useVault } from '@/lib/vault/store';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { Lock, Shield, Menu, Search, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function Header() {
  const { state, dispatch } = useVault();
  const { isSignedIn } = useUser();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="vault-glass-header sticky top-0 z-20 border-b border-white/[0.06]">
        {isMobileSearchOpen ? (
          <div className="flex h-14 w-full items-center px-4 gap-3 md:hidden">
            <div className="flex-1 w-full">
              <SearchBar />
            </div>
            <button
               onClick={() => {
                 setIsMobileSearchOpen(false);
                 dispatch({ type: 'SET_SEARCH', query: '' });
                 dispatch({ type: 'SET_SELECTED_TAGS', tags: [] });
               }}
               className="text-sm font-medium shrink-0 text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
            >
               Cancel
            </button>
          </div>
        ) : (
          <div className="flex h-14 w-full items-center justify-between px-4">
            {/* Left Side: Hamburger, Logo, Search */}
            <div className="flex flex-1 items-center gap-5">
          {/* Hamburger Menu & Logo */}
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <button
              onClick={() => dispatch({ type: 'SET_SIDEBAR', open: !state.sidebarOpen })}
              className="rounded-lg p-1.5 text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--vault-gold)] to-[var(--vault-gold-light)]">
                <Shield className="h-4 w-4 text-[#0a0a0f]" />
              </div>
              <h1 className="vault-heading hidden text-lg font-bold tracking-widest text-[var(--vault-gold)] sm:block">
                VAULT
              </h1>
            </div>
          </div>

          {/* Search */}
          <div className="w-full max-w-md hidden md:block">
            <SearchBar />
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          {/* Mobile Search Icon */}
          <button 
            className="md:hidden rounded-lg p-1.5 text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
            onClick={() => setIsMobileSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-lg p-1.5 text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>

          <ThemeToggle />



          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button
                id="login-btn-header"
                className="flex items-center gap-1 rounded-lg border border-[var(--vault-gold)]/30 px-2.5 py-1.5 text-xs font-medium text-[var(--vault-gold)] transition-colors hover:bg-[var(--vault-gold)]/10"
              >
                <Lock className="h-3 w-3" /> Login
              </button>
            </SignInButton>
          )}
        </div>
      </div>
      )}
    </header>
    <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
