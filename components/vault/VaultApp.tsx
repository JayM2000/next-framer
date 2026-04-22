'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { VaultProvider, useVault } from '@/lib/vault/store';
import Header from './Header';
import Dashboard from './Dashboard';
import PublicBoard from './PublicBoard';
import VaultSidebar from './VaultSidebar';
import CreateItemModal from './CreateItemModal';
import Toast from './Toast';
import MobileNav from './MobileNav';
import MobileQuickAdd from './MobileQuickAdd';
import MainSidebar from './MainSidebar';

function VaultContent() {
  const { state, dispatch } = useVault();

  return (
    <div className="vault-app glass-dot-bg flex h-screen overflow-hidden bg-[var(--vault-bg)]">

      {/* Desktop: Sidebar (fixed full-height column) */}
      <motion.div
        animate={{ width: state.sidebarOpen ? 256 : 64 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="vault-glass-sidebar hidden sm:flex shrink-0 border-r border-white/[0.06] overflow-hidden"
      >
        <MainSidebar />
      </motion.div>

      {/* Right side: scrollable column with sticky header */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Desktop scrollable area — header sticks, content flows under it */}
        <div className="hidden sm:flex flex-col flex-1 min-h-0 min-w-0">
          <Header />
          <div className="relative z-0 flex-1 flex flex-col min-h-0">
            <Dashboard />
          </div>
        </div>

        {/* Mobile scrollable area */}
        <div className="block sm:hidden flex-1 overflow-y-auto pb-16">
          <Header />
          <div className="mx-auto max-w-7xl px-4 py-4">
            {state.activeTab === 'dashboard' && <PublicBoard />}
            {state.activeTab === 'vault' && <VaultSidebar />}
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
