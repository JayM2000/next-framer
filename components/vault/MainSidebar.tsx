'use client';

import { useState } from 'react';
import { useVault } from '@/lib/vault/store';
import { 
  Plus, 
  LayoutDashboard, 
  Lock, 
  KeyRound, 
  FileText, 
  ClipboardCopy, 
  Settings, 
  Trash2,
  Shield,
  Menu
} from 'lucide-react';
import { AppState } from '@/lib/vault/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SettingsModal from './SettingsModal';

export default function MainSidebar() {
  const { state, dispatch } = useVault();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleCategoryChange = (category: AppState['activeCategory']) => {
    dispatch({ type: 'SET_CATEGORY', category });
    
    // Automatically switch tabs for mobile view based on category
    if (category === 'private' || category === 'trash') {
      dispatch({ type: 'SET_TAB', tab: 'vault' });
    } else {
      dispatch({ type: 'SET_TAB', tab: 'dashboard' });
    }

    // On mobile, automatically close the sidebar overlay after selection
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      dispatch({ type: 'SET_SIDEBAR', open: false });
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, category: 'all' },
    { label: 'Private Vault', icon: Lock, category: 'private' },
  ] as const;

  const categoryItems = [
    { label: 'Passwords', icon: KeyRound, category: 'passwords' },
    { label: 'Secure Notes', icon: FileText, category: 'notes' },
    { label: 'Clipboard Snippets', icon: ClipboardCopy, category: 'clipboard' },
  ] as const;

  const systemItems = [
    { label: 'Settings', icon: Settings, category: null, action: () => setSettingsOpen(true) },
    { label: 'Trash', icon: Trash2, category: 'trash', action: undefined },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="h-full w-full flex flex-col">
      
        {/* Top Fixed Area */}
        <div className={`flex shrink-0 items-center border-b border-white/[0.06] h-14 transition-all ${state.sidebarOpen ? 'px-4' : 'px-0 justify-center'}`}>
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => dispatch({ type: 'SET_SIDEBAR', open: !state.sidebarOpen })}
              className={`rounded-lg p-1.5 text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors shrink-0 ${!state.sidebarOpen && 'mx-auto'}`}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {state.sidebarOpen && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--vault-gold)] to-[var(--vault-gold-light)]">
                  <Shield className="h-4 w-4 text-[#0a0a0f]" />
                </div>
                <h1 className="vault-heading text-lg font-bold tracking-widest text-[var(--vault-gold)] truncate">
                  VAULT
                </h1>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Center Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Logo when collapsed */}
          {!state.sidebarOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleCategoryChange('all')}
                  className="mb-6 flex w-full items-center justify-center transition-transform hover:scale-105"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--vault-gold)] to-[var(--vault-gold-light)] shadow-lg shadow-[var(--vault-gold)]/20">
                    <Shield className="h-4 w-4 text-[#0a0a0f]" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">
                Go to Home page
              </TooltipContent>
            </Tooltip>
          )}

          {/* Quick Action */}
      {!state.sidebarOpen ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => dispatch({ type: 'SET_DRAWER', open: true })}
              className={`vault-btn-primary mb-6 flex w-full items-center justify-center gap-2 p-2`}
            >
              <Plus className="h-4 w-4 shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">New Item</TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={() => dispatch({ type: 'SET_DRAWER', open: true })}
          className="vault-btn-primary mb-6 flex w-full items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">New Item</span>
        </button>
      )}

      {/* Main Nav */}
      <div className="mb-6 space-y-1">
        {navItems.map((item) => {
          const isActive = state.activeCategory === item.category;
          const buttonContent = (
            <button
              key={item.category}
              onClick={() => handleCategoryChange(item.category)}
              className={`flex w-full items-center rounded-lg py-2 text-sm font-medium transition-all ${
                state.sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'
              } ${
                isActive
                  ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                  : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors'
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
              {state.sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          );

          return !state.sidebarOpen ? (
            <Tooltip key={item.category}>
              <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
              <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">{item.label}</TooltipContent>
            </Tooltip>
          ) : buttonContent;
        })}
      </div>

      {/* Categories */}
      <div className="mb-6">
        {state.sidebarOpen && (
          <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--vault-muted)]">
            Categories
          </h4>
        )}
        <div className="space-y-1">
          {categoryItems.map((item) => {
            const isActive = state.activeCategory === item.category;
            const buttonContent = (
              <button
                key={item.category}
                onClick={() => handleCategoryChange(item.category)}
                className={`flex w-full items-center rounded-lg py-2 text-sm font-medium transition-all ${
                  state.sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'
                } ${
                  isActive
                    ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                    : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors'
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
                {state.sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );

            return !state.sidebarOpen ? (
              <Tooltip key={item.category}>
                <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">{item.label}</TooltipContent>
              </Tooltip>
            ) : buttonContent;
          })}
        </div>
      </div>

      {/* System */}
      <div>
        {state.sidebarOpen && (
          <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--vault-muted)]">
            System
          </h4>
        )}
        <div className="space-y-1">
          {systemItems.map((item) => {
            const isActive = item.category ? state.activeCategory === item.category : false;
            const buttonContent = (
              <button
                key={item.label}
                onClick={() => item.action ? item.action() : handleCategoryChange(item.category as AppState['activeCategory'])}
                className={`flex w-full items-center rounded-lg py-2 text-sm font-medium transition-all ${
                  state.sidebarOpen ? 'gap-3 px-3' : 'justify-center px-0'
                } ${
                  isActive
                    ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                    : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors'
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
                {state.sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );

            return !state.sidebarOpen ? (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">{item.label}</TooltipContent>
              </Tooltip>
            ) : buttonContent;
          })}
        </div>
      </div>
      </div>

      {/* Bottom Fixed Area */}
      <div className={`shrink-0 border-t border-white/[0.06] p-4 transition-all ${
         state.sidebarOpen ? 'text-left' : 'text-center'
      }`}>
        {state.sidebarOpen ? (
          <div className="flex flex-col gap-1 text-[10px] text-[var(--vault-muted)]">
            <span>© {new Date().getFullYear()} Vault App.</span>
            <span>Version 1.0.0</span>
          </div>
        ) : (
           <span className="text-[10px] font-bold text-[var(--vault-muted)]">v1</span>
        )}
      </div>

    </aside>
    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </TooltipProvider>
  );
}
