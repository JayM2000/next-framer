'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, FileText, Clipboard, Tag, Calendar, BarChart3, Sparkles } from 'lucide-react';
import { trpc } from '@/trpc/client';

interface Props {
  userId: number;
  ownerName: string;
  children: React.ReactNode;
}

/* ─── Smooth spline generator ─── */
function catmullRom2bezier(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let result = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    result += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return result;
}

/* ─── Animated counter ─── */
function AnimatedCount({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    const start = performance.now();
    const from = display;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{display}</span>;
}

export default function UserProfileHoverCard({ userId, ownerName, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const openTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Lazy-fetch profile data only when hovered
  const { data: profile, isLoading } = trpc.vault.getUserProfile.useQuery(
    { userId },
    { enabled: open, retry: false, refetchOnWindowFocus: false }
  );

  const CARD_W = 288; // w-72 = 18rem = 288px

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    // Clamp so it doesn't overflow viewport
    left = Math.max(8, Math.min(left, window.innerWidth - CARD_W - 8));
    setPos({ top: rect.bottom + 8, left });
  }, []);

  // Cancel any pending close when entering either trigger or card
  const cancelClose = useCallback(() => {
    clearTimeout(closeTimeout.current);
  }, []);

  // Schedule close with a delay so mouse can traverse the gap
  const scheduleClose = useCallback(() => {
    clearTimeout(openTimeout.current);
    closeTimeout.current = setTimeout(() => setOpen(false), 80);
  }, []);

  const handleTriggerEnter = () => {
    cancelClose();
    openTimeout.current = setTimeout(() => {
      computePosition();
      setOpen(true);
    }, 80);
  };

  const handleTriggerLeave = () => {
    clearTimeout(openTimeout.current);
    scheduleClose();
  };

  const handleCardEnter = () => {
    cancelClose(); // mouse reached the card — keep it open
  };

  const handleCardLeave = () => {
    scheduleClose();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger ItemCard's onClick
    computePosition();
    setOpen(prev => !prev);
  };

  // Initials for avatar
  const initials = ownerName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const maxActivity = profile ? Math.max(...profile.activityData.map(d => d.count), 1) : 1;

  // Visual Graph calculations
  const totalComp = profile ? (profile.passwordCount + profile.noteCount + profile.clipboardCount) || 1 : 1;
  const pPct = profile ? (profile.passwordCount / totalComp) * 100 : 0;
  const nPct = profile ? (profile.noteCount / totalComp) * 100 : 0;
  const cPct = profile ? (profile.clipboardCount / totalComp) * 100 : 0;

  const CHART_W = 256;
  const CHART_H = 48;
  const graphPts = profile ? profile.activityData.map((d, i) => {
    const x = (i / (profile.activityData.length - 1)) * CHART_W;
    // Add 2px padding top/bottom so strokes don't clip
    const y = (CHART_H - 4) - (d.count / maxActivity) * (CHART_H - 4) + 2; 
    return { x, y };
  }) : [];
  const linePath = catmullRom2bezier(graphPts);
  const areaPath = graphPts.length ? `${linePath} L${CHART_W},${CHART_H} L0,${CHART_H} Z` : '';

  return (
    <>
      <span
        className="relative inline-flex"
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onClick={handleClick}
        ref={triggerRef}
      >
        {children}
      </span>

      {/* Portal the popover to document.body so it escapes overflow-hidden parents */}
      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                className="fixed z-[99999] w-72 rounded-xl border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl shadow-black/20"
                style={{ top: pos.top, left: pos.left, backdropFilter: 'blur(16px)' }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleCardEnter}
                onMouseLeave={handleCardLeave}
              >
                {/* Loading skeleton */}
                {isLoading && (
                  <div className="flex flex-col items-center gap-3 p-6">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-[var(--vault-glass)]" />
                    <div className="h-3 w-24 animate-pulse rounded bg-[var(--vault-glass)]" />
                    <div className="h-2 w-32 animate-pulse rounded bg-[var(--vault-glass)]" />
                  </div>
                )}

                {/* Profile content */}
                {profile && !isLoading && (
                  <>
                    {/* Accent gradient top bar */}
                    <div
                      className="absolute left-0 right-0 top-0 h-px rounded-t-xl"
                      style={{ background: 'linear-gradient(90deg, transparent, var(--vault-gold), transparent)' }}
                    />

                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--vault-gold)] to-[var(--vault-gold-light)] text-sm font-bold text-[#0a0a0f]">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-semibold text-[var(--vault-text)]">
                          {profile.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--vault-muted)]">
                          <Calendar className="h-2.5 w-2.5" />
                          Member since {new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-px border-t border-[var(--vault-border)] bg-[var(--vault-border)]">
                      {[
                        { icon: KeyRound, label: 'Passwords', value: profile.passwordCount, color: '#e0a526' },
                        { icon: FileText, label: 'Notes', value: profile.noteCount, color: '#a78bfa' },
                        { icon: Clipboard, label: 'Snippets', value: profile.clipboardCount, color: '#38bdf8' },
                      ].map(stat => (
                        <div key={stat.label} className="flex flex-col items-center gap-0.5 bg-[var(--vault-panel)] py-2.5">
                          <stat.icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                          <span className="text-sm font-bold text-[var(--vault-text)]">
                            <AnimatedCount value={stat.value} />
                          </span>
                          <span className="text-[9px] text-[var(--vault-muted)]">{stat.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Composition Bar */}
                    <div className="border-b border-[var(--vault-border)] bg-[var(--vault-panel)] px-4 pb-3 pt-1">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--vault-glass)]">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full bg-[#e0a526]" />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${nPct}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }} className="h-full bg-[#a78bfa]" />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${cPct}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }} className="h-full bg-[#38bdf8]" />
                      </div>
                    </div>

                    {/* Extra stats row */}
                    <div className="flex items-center justify-around px-4 py-2 text-[10px]">
                      <span className="flex items-center gap-1 text-[var(--vault-muted)]">
                        <Sparkles className="h-2.5 w-2.5 text-[var(--vault-gold)]" />
                        <span className="font-semibold text-[var(--vault-text)]">
                          <AnimatedCount value={profile.totalPublicItems} />
                        </span> public items
                      </span>
                      <span className="h-2.5 w-px bg-[var(--vault-border)]" />
                      <span className="flex items-center gap-1 text-[var(--vault-muted)]">
                        <Tag className="h-2.5 w-2.5 text-[var(--vault-gold)]" />
                        <span className="font-semibold text-[var(--vault-text)]">
                          <AnimatedCount value={profile.totalTags} />
                        </span> tags
                      </span>
                    </div>

                    {/* Animated Smooth Area Chart */}
                    <div className="border-t border-[var(--vault-border)] px-4 pt-2.5 pb-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--vault-muted)]">
                          <BarChart3 className="h-2.5 w-2.5" />
                          12-Week Activity
                        </div>
                        <span className="text-[9px] text-[var(--vault-muted)] opacity-60">Peak: {maxActivity}</span>
                      </div>
                      
                      <div className="relative w-full" style={{ height: CHART_H }}>
                        <svg width="100%" height="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="overflow-visible">
                          <defs>
                            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--vault-gold)" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="var(--vault-gold)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Animated Area Fill */}
                          <motion.path
                            d={areaPath}
                            fill="url(#area-gradient)"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                          />
                          
                          {/* Animated Stroke Line */}
                          <motion.path
                            d={linePath}
                            fill="none"
                            stroke="var(--vault-gold)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.2, ease: "easeInOut" }}
                          />
                        </svg>

                        {/* Interactive invisible columns for tooltip/hover effects could go here, 
                            but for now the smooth curve is beautiful on its own. */}
                      </div>
                    </div>
                  </>
                )}

                {/* Profile not available */}
                {!profile && !isLoading && (
                  <div className="p-4 text-center text-xs text-[var(--vault-muted)]">
                    Profile not available
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
