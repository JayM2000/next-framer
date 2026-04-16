'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import { CheckCircle } from 'lucide-react';

export default function Toast() {
  const { state } = useVault();

  return (
    <AnimatePresence>
      {state.toast.visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2"
        >
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur-md">
            <CheckCircle className="h-4 w-4" />
            {state.toast.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
