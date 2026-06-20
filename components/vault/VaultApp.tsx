'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { VaultProvider, useVault } from '@/lib/vault/store';
import Header from './Header';
import Toast from './Toast';
import MobileNav from './MobileNav';
import MobileQuickAdd from './MobileQuickAdd';
import MainSidebar from './MainSidebar';
import SessionDashboard from '@/components/canvas/SessionDashboard';
import CanvasEditor from '@/components/canvas/CanvasEditor';
import VaultSidebar from './VaultSidebar';
import CreateItemModal from './CreateItemModal';
import { useCallback } from 'react';

function VaultContent() {
  const { state, dispatch } = useVault();

  const handleNavigateHome = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null });
    dispatch({ type: 'SET_CATEGORY', category: 'all' });
  }, [dispatch]);

  const handleOpenSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_ACTIVE_SESSION', sessionId });
  }, [dispatch]);

  // Determine main content area
  const renderMainContent = () => {
    // If a session is active, show the canvas editor
    if (state.activeSessionId) {
      return (
        <CanvasEditor
          sessionId={state.activeSessionId}
          onNavigateHome={handleNavigateHome}
          onNavigateSession={handleOpenSession}
        />
      );
    }

    // If trash is selected, show the vault sidebar (existing trash view)
    if (state.activeCategory === 'trash' || state.activeCategory === 'private') {
      return (
        <div className="w-full mx-auto max-w-4xl px-4 pt-6 pb-0 flex flex-col flex-1 min-h-0">
          <button
            onClick={handleNavigateHome}
            className="shrink-0 mb-4 flex w-fit items-center gap-2 rounded-lg py-2 pr-4 text-sm font-medium text-[var(--vault-muted)] hover:text-[var(--vault-text)] transition-colors"
          >
            ← Back to Dashboard
          </button>
          <VaultSidebar />
        </div>
      );
    }

    // Default: show session dashboard
    return <SessionDashboard onOpenSession={handleOpenSession} />;
  };

  return (
    <div className="vault-app glass-dot-bg flex h-screen overflow-hidden bg-[var(--vault-bg)]">

      {/* Desktop: Sidebar (fixed full-height column) */}
      <motion.div
        initial={false}
        animate={{ width: state.sidebarOpen ? 256 : 64 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="vault-glass-sidebar hidden sm:flex shrink-0 border-r border-white/[0.06] overflow-hidden"
      >
        <MainSidebar />
      </motion.div>

      {/* Right side: scrollable column with sticky header */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Desktop scrollable area */}
        <div className="hidden sm:flex flex-col flex-1 min-h-0 min-w-0">
          <Header />
          <div className={`relative flex-1 flex flex-col min-h-0 ${(!state.activeSessionId && state.activeCategory === 'all') ? 'overflow-hidden' : ''}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={state.activeSessionId || state.activeCategory || 'canvas'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile scrollable area */}
        <div className="flex sm:hidden flex-1 flex-col min-h-0 pb-16">
          <Header />
          <div className="mx-auto max-w-7xl px-4 py-4 flex-1 flex flex-col min-h-0 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={state.activeSessionId || 'dashboard'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {state.sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => dispatch({ type: 'SET_SIDEBAR', open: false })}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md sm:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="vault-glass-sidebar fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.06] shadow-2xl sm:hidden"
            >
              <MainSidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreateItemModal />
      <Toast />
      <MobileQuickAdd />
      <MobileNav />
    </div>
  );
}

export default function VaultApp() {
  return (
    <VaultProvider>
      <VaultContent />
    </VaultProvider>
  );
}
