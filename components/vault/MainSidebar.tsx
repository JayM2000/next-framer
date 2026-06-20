'use client';

import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import { trpc } from '@/trpc/client';
import {
  Plus,
  Shield,
  Settings,
  Trash2,
  Menu,
  LayoutDashboard,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SettingsModal from './SettingsModal';
import SessionListItem from '@/components/sidebar/SessionListItem';
import SidebarSearch from '@/components/sidebar/SidebarSearch';

export default function MainSidebar() {
  const { state, dispatch } = useVault();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const utils = trpc.useUtils();

  // Sessions data
  const { data: sessions = [] } = trpc.sessions.getSessions.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const createSession = trpc.sessions.createSession.useMutation({
    onSuccess: (newSession) => {
      utils.sessions.getSessions.invalidate();
      dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: newSession.id });
    },
  });

  const deleteSession = trpc.sessions.deleteSession.useMutation({
    onSuccess: () => {
      utils.sessions.getSessions.invalidate();
      if (state.activeSessionId) {
        dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null });
      }
    },
  });

  const duplicateSession = trpc.sessions.duplicateSession.useMutation({
    onSuccess: () => utils.sessions.getSessions.invalidate(),
  });

  const updateSession = trpc.sessions.updateSession.useMutation({
    onSuccess: () => utils.sessions.getSessions.invalidate(),
  });

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.tags.some(t => t.label.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  // Separate root sessions and children
  const rootSessions = useMemo(() => filteredSessions.filter(s => !s.parentId), [filteredSessions]);

  const handleNewSession = useCallback(() => {
    createSession.mutate({ title: 'Untitled Session', emoji: '📄' });
    // Close mobile sidebar
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      dispatch({ type: 'SET_SIDEBAR', open: false });
    }
  }, [createSession, dispatch]);

  const handleOpenSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId });
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      dispatch({ type: 'SET_SIDEBAR', open: false });
    }
  }, [dispatch]);

  const handleGoToDashboard = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null });
    dispatch({ type: 'SET_CATEGORY', category: 'all' });
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      dispatch({ type: 'SET_SIDEBAR', open: false });
    }
  }, [dispatch]);

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
                  onClick={handleGoToDashboard}
                  className="mb-6 flex w-full items-center justify-center transition-transform hover:scale-105"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--vault-gold)] to-[var(--vault-gold-light)] shadow-lg shadow-[var(--vault-gold)]/20">
                    <Shield className="h-4 w-4 text-[#0a0a0f]" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">
                Go to Dashboard
              </TooltipContent>
            </Tooltip>
          )}

          {/* New Session Button */}
          {!state.sidebarOpen ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleNewSession}
                  className="vault-btn-primary mb-4 flex w-full items-center justify-center gap-2 p-2"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">
                New Session
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleNewSession}
              className="vault-btn-primary mb-4 flex w-full items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">New Session</span>
            </button>
          )}

          {/* Dashboard link */}
          {!state.sidebarOpen ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleGoToDashboard}
                  className={`flex w-full items-center justify-center rounded-lg py-2 transition-all mb-4 ${
                    !state.activeSessionId
                      ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                      : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]'
                  }`}
                >
                  <LayoutDashboard className={`h-4 w-4 ${!state.activeSessionId ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">
                Dashboard
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleGoToDashboard}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all mb-2 ${
                !state.activeSessionId
                  ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                  : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]'
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 shrink-0 ${!state.activeSessionId ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
              <span className="truncate">Dashboard</span>
            </button>
          )}

          {/* Search */}
          {state.sidebarOpen && (
            <div className="mb-4">
              <SidebarSearch
                value={searchQuery}
                onChange={setSearchQuery}
                isCollapsed={!state.sidebarOpen}
              />
            </div>
          )}

          {/* Sessions List */}
          {state.sidebarOpen && (
            <div className="mb-6">
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--vault-muted)]">
                Sessions
              </h4>
              <div className="space-y-0.5">
                <AnimatePresence>
                  {rootSessions.map(session => (
                    <SessionListItem
                      key={session.id}
                      session={session}
                      isActive={state.activeSessionId === session.id}
                      isCollapsed={!state.sidebarOpen}
                      onClick={() => handleOpenSession(session.id)}
                      onDelete={() => deleteSession.mutate({ id: session.id })}
                      onDuplicate={() => duplicateSession.mutate({ id: session.id })}
                      onTogglePin={() => updateSession.mutate({ id: session.id, isPinned: !session.isPinned })}
                      onRename={(newTitle) => updateSession.mutate({ id: session.id, title: newTitle })}
                    />
                  ))}
                </AnimatePresence>

                {rootSessions.length === 0 && (
                  <div className="py-4 text-center text-xs text-[var(--vault-muted)]">
                    {searchQuery ? 'No matching sessions' : 'No sessions yet'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsed sessions list */}
          {!state.sidebarOpen && (
            <div className="space-y-1 mb-6">
              {rootSessions.slice(0, 8).map(session => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  isActive={state.activeSessionId === session.id}
                  isCollapsed={true}
                  onClick={() => handleOpenSession(session.id)}
                  onDelete={() => deleteSession.mutate({ id: session.id })}
                  onDuplicate={() => duplicateSession.mutate({ id: session.id })}
                  onTogglePin={() => updateSession.mutate({ id: session.id, isPinned: !session.isPinned })}
                  onRename={(newTitle) => updateSession.mutate({ id: session.id, title: newTitle })}
                />
              ))}
            </div>
          )}

          {/* System */}
          <div>
            {state.sidebarOpen && (
              <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--vault-muted)]">
                System
              </h4>
            )}
            <div className="space-y-1">
              {/* Settings */}
              {!state.sidebarOpen ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="flex w-full items-center justify-center rounded-lg py-2 text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
                    >
                      <Settings className="h-4 w-4 text-[var(--vault-muted)]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">Settings</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)] transition-colors"
                >
                  <Settings className="h-4 w-4 text-[var(--vault-muted)]" />
                  <span className="truncate">Settings</span>
                </button>
              )}

              {/* Trash */}
              {!state.sidebarOpen ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        dispatch({ type: 'SET_CATEGORY', category: 'trash' });
                        dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null });
                      }}
                      className={`flex w-full items-center justify-center rounded-lg py-2 transition-all ${
                        state.activeCategory === 'trash'
                          ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                          : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]'
                      }`}
                    >
                      <Trash2 className={`h-4 w-4 ${state.activeCategory === 'trash' ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="border-[var(--vault-border)] bg-[var(--vault-panel)] text-[var(--vault-text)]">Trash</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_CATEGORY', category: 'trash' });
                    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null });
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    state.activeCategory === 'trash'
                      ? 'bg-[var(--vault-gold)]/10 text-[var(--vault-gold)]'
                      : 'text-[var(--vault-text)] hover:bg-[var(--vault-glass-hover)]'
                  }`}
                >
                  <Trash2 className={`h-4 w-4 ${state.activeCategory === 'trash' ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
                  <span className="truncate">Trash</span>
                </button>
              )}
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
              <span>Version 2.0.0</span>
            </div>
          ) : (
            <span className="text-[10px] font-bold text-[var(--vault-muted)]">v2</span>
          )}
        </div>

      </aside>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </TooltipProvider>
  );
}
