'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useVault } from '@/lib/vault/store';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

const themes = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: CheckCircle,
    progress: 'bg-emerald-500/50',
    shadow: 'shadow-[0_8px_30px_-4px_rgba(16,185,129,0.25)]'
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: XCircle,
    progress: 'bg-red-500/50',
    shadow: 'shadow-[0_8px_30px_-4px_rgba(239,68,68,0.25)]'
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: AlertTriangle,
    progress: 'bg-amber-500/50',
    shadow: 'shadow-[0_8px_30px_-4px_rgba(245,158,11,0.25)]'
  }
};

export default function Toast() {
  const { state } = useVault();
  const [progressKey, setProgressKey] = useState(0);

  // Restart progress bar animation every time toast becomes visible
  useEffect(() => {
    if (state.toast.visible) {
      setProgressKey(prev => prev + 1);
    }
  }, [state.toast.visible, state.toast.message]);

  const type = state.toast.type || 'success';
  const theme = themes[type];
  const Icon = theme.icon;

  return (
    <AnimatePresence>
      {state.toast.visible && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-4 left-4 right-4 sm:top-6 sm:left-1/2 sm:right-auto sm:w-max sm:-translate-x-1/2 z-[100] flex justify-center pointer-events-none"
        >
          <div className={`pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-xl ${theme.bg} ${theme.border} ${theme.shadow} max-w-sm w-full sm:w-auto`}>
            
            {/* Content */}
            <div className={`flex items-center gap-3 px-4 py-3 font-medium ${theme.text}`}>
              <Icon className="h-5 w-5 shrink-0" />
              <p className="text-sm leading-tight">{state.toast.message}</p>
            </div>

            {/* Progress line timer */}
            <motion.div
              key={progressKey}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4.8, ease: 'linear' }}
              className={`absolute bottom-0 left-0 h-[3px] ${theme.progress}`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
