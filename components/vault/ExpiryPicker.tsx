'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CalendarClock, ChevronDown, X } from 'lucide-react';

// ── Preset durations ───────────────────────────────────────
const PRESETS = [
  { label: '1 Min', ms: 1 * 60 * 1000 },
  { label: '5 Min', ms: 5 * 60 * 1000 },
  { label: '1 Hour', ms: 1 * 60 * 60 * 1000 },
  { label: '1 Day', ms: 24 * 60 * 60 * 1000 },
  { label: '7 Days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 Days', ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

const MIN_MS = 60 * 1000;                  // 1 minute
const MAX_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

interface ExpiryPickerProps {
  value: string | null;           // ISO date string or null
  onChange: (iso: string | null) => void;
  compact?: boolean;              // for mobile layouts
}

// ── Human-readable countdown ──────────────────────────────
function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes} min`;
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${seconds}s`;
}

export default function ExpiryPicker({ value, onChange, compact }: ExpiryPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick every 10 seconds for countdown (more responsive for short expiries)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when Custom section opens
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showCustom && bottomRef.current) {
      // Small delay to let the expand animation start
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 150);
    }
  }, [showCustom]);

  // Compute remaining time
  const remainingMs = useMemo(() => {
    if (!value) return null;
    return new Date(value).getTime() - now;
  }, [value, now]);

  // Min/max for date input
  const minDate = useMemo(() => {
    const d = new Date(Date.now() + MIN_MS);
    return d.toISOString().slice(0, 10);
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date(Date.now() + MAX_MS);
    return d.toISOString().slice(0, 10);
  }, []);

  const minTime = useMemo(() => {
    return '00:00'; // Allow any time — backend validates minimum
  }, []);

  const handlePreset = useCallback((index: number, ms: number) => {
    setActivePreset(index);
    setShowCustom(false);
    const expiresAt = new Date(Date.now() + ms).toISOString();
    onChange(expiresAt);
  }, [onChange]);

  const handleCustomApply = useCallback(() => {
    if (!customDate || !customTime) return;
    const dt = new Date(`${customDate}T${customTime}:00`);
    const diffMs = dt.getTime() - Date.now();

    if (diffMs < MIN_MS) {
      return; // too soon — input constraints should prevent this
    }
    if (diffMs > MAX_MS) {
      return; // too far
    }

    setActivePreset(null);
    onChange(dt.toISOString());
  }, [customDate, customTime, onChange]);

  const handleClear = useCallback(() => {
    setActivePreset(null);
    setShowCustom(false);
    setCustomDate('');
    setCustomTime('');
    onChange(null);
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 text-[var(--vault-gold)]" />
        <span className="text-xs font-medium text-[var(--vault-muted)]">
          Item Expiry
        </span>
        {value && (
          <button
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-[var(--vault-muted)] hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)] transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Preset pills */}
      <div className={`flex flex-wrap gap-1.5 ${compact ? 'gap-1' : ''}`}>
        {PRESETS.map((preset, i) => (
          <motion.button
            key={preset.label}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handlePreset(i, preset.ms)}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
              activePreset === i
                ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/15 text-[var(--vault-gold)] shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-[var(--vault-gold)]/30 hover:text-[var(--vault-text)]'
            }`}
          >
            {preset.label}
          </motion.button>
        ))}

        {/* Custom toggle */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setShowCustom(!showCustom);
            if (!showCustom) setActivePreset(null);
          }}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
            showCustom
              ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/15 text-[var(--vault-gold)]'
              : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-[var(--vault-gold)]/30 hover:text-[var(--vault-text)]'
          }`}
        >
          <Clock className="h-3 w-3" />
          Custom
          <ChevronDown className={`h-3 w-3 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
        </motion.button>
      </div>

      {/* Custom date/time inputs */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 rounded-lg border border-[var(--vault-border)] bg-[var(--vault-bg)]/50 p-3">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-medium text-[var(--vault-muted)] uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={minDate}
                  max={maxDate}
                  className="vault-input text-xs !py-1.5"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-medium text-[var(--vault-muted)] uppercase tracking-wider">Time</label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  min={minTime}
                  className="vault-input text-xs !py-1.5"
                />
              </div>
              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCustomApply}
                  disabled={!customDate || !customTime}
                  className="rounded-lg bg-[var(--vault-gold)]/15 border border-[var(--vault-gold)]/30 px-3 py-1.5 text-[11px] font-semibold text-[var(--vault-gold)] transition-all hover:bg-[var(--vault-gold)]/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Set
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status display */}
      <AnimatePresence mode="wait">
        {value && remainingMs !== null && remainingMs > 0 && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2"
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
              <Clock className="relative h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-xs text-emerald-400">
              Expires in <strong>{formatCountdown(remainingMs)}</strong>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
