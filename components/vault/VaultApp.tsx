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
    <div className="vault-app flex h-screen flex-col overflow-hidden bg-[var(--vault-bg)]">
      <Header />

      {/* Desktop: 3-column view */}
      <div className="hidden sm:flex flex-1 overflow-hidden">
        {/* Left Sidebar wrapper */}
        <motion.div
          animate={{ width: state.sidebarOpen ? 256 : 64 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="shrink-0 border-r border-[var(--vault-border)] overflow-hidden"
        >
          <MainSidebar />
        </motion.div>
        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          <Dashboard />
        </div>
      </div>

      {/* Mobile: tab-based views */}
      <div className="block sm:hidden flex-1 overflow-y-auto pb-16">
        <div className="mx-auto max-w-7xl px-4 py-4">
          {state.activeTab === 'dashboard' && <PublicBoard />}
          {state.activeTab === 'vault' && <VaultSidebar />}
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
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl sm:hidden"
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
