'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Eye, EyeOff, User, Globe, Sparkles } from 'lucide-react';
import { useVault } from '@/lib/vault/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { userSettings, updateUserSettings, currentDbUserId } = useVault();
  const [localProfilePublic, setLocalProfilePublic] = useState(false);
  const [localAutoTag, setLocalAutoTag] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setLocalProfilePublic(userSettings?.showProfileOnPublic ?? false);
      setLocalAutoTag(userSettings?.autoTagEnabled ?? true);
    }
  }, [open, userSettings?.showProfileOnPublic, userSettings?.autoTagEnabled]);

  const handleToggle = () => {
    setLocalProfilePublic(!localProfilePublic);
  };

  const handleApply = () => {
    updateUserSettings(localProfilePublic, localAutoTag);
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="vault-settings-modal-portal">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 z-[9999] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl"
          >
            {/* Top accent bar */}
            <div className="absolute left-0 right-0 top-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, var(--vault-gold), transparent)' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--vault-border)] px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--vault-text)]">
                <Shield className="h-4 w-4 text-[var(--vault-gold)]" />
                Settings
              </h2>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 px-5 py-5">
              {/* Profile Visibility */}
              {currentDbUserId && (
                <div className="rounded-xl border border-[var(--vault-border)] bg-[var(--vault-glass)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--vault-text)]">
                        {localProfilePublic ? (
                          <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-[var(--vault-muted)]" />
                        )}
                        Public Profile
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--vault-muted)]">
                        When enabled, your name appears on public board cards instead of &quot;You&quot;. 
                        Other users can hover over your name to see your profile card with stats and activity.
                      </p>
                    </div>

                    {/* Toggle switch */}
                    <button
                      onClick={handleToggle}
                      className={`relative mt-0.5 flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ${
                        localProfilePublic
                          ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]'
                          : 'border-[var(--vault-border)] bg-[var(--vault-glass)]'
                      }`}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`h-4.5 w-4.5 rounded-full shadow-sm ${
                          localProfilePublic ? 'bg-[#0a0a0f]' : 'bg-[var(--vault-muted)]'
                        }`}
                        style={{
                          width: 18,
                          height: 18,
                          marginLeft: localProfilePublic ? 21 : 2,
                        }}
                      />
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="mt-3 border-t border-[var(--vault-border)] pt-3">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">
                      Preview
                    </span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-[var(--vault-muted)]">Your badge:</span>
                      {localProfilePublic ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--vault-gold)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--vault-gold)] shadow-sm">
                          <User className="h-2.5 w-2.5" />
                          Your Name
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--vault-gold)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--vault-gold)] shadow-sm">
                          <User className="h-2.5 w-2.5" />
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-[var(--vault-muted)]">Others see:</span>
                      {localProfilePublic ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--vault-gold)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--vault-gold)] shadow-sm">
                          <User className="h-2.5 w-2.5" />
                          Your Name
                          <span className="ml-0.5 text-[8px] text-emerald-400">+ hover card</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                          <Globe className="h-2.5 w-2.5" />
                          Anonymous
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Auto Tag */}
              <div className="rounded-xl border border-[var(--vault-border)] bg-[var(--vault-glass)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--vault-text)]">
                      <Sparkles className={`h-3.5 w-3.5 ${localAutoTag ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
                      Auto Tag
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--vault-muted)]">
                      Automatically generate tags from your content when you don&apos;t add any manually.
                      Tags are extracted from keywords in your snippets.
                    </p>
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => setLocalAutoTag(!localAutoTag)}
                    className={`relative mt-0.5 flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ${
                      localAutoTag
                        ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]'
                        : 'border-[var(--vault-border)] bg-[var(--vault-glass)]'
                    }`}
                  >
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={`rounded-full shadow-sm ${
                        localAutoTag ? 'bg-[#0a0a0f]' : 'bg-[var(--vault-muted)]'
                      }`}
                      style={{
                        width: 18,
                        height: 18,
                        marginLeft: localAutoTag ? 21 : 2,
                      }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--vault-border)] px-5 py-3">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="vault-btn-primary text-xs"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
