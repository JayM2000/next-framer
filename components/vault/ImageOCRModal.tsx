'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, ScanText, Loader2, Check, Image as ImageIcon,
  Crop, MousePointerSquareDashed, RotateCcw, AlertCircle,
} from 'lucide-react';

// ── URL auto-detection regex ──────────────────────────
const URL_REGEX = /https?:\/\/[^\s<>"'`,;)\]]+|www\.[^\s<>"'`,;)\]]+/gi;

function autoLinkText(text: string): { html: string; plain: string } {
  const plain = text;
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(URL_REGEX, (match) => {
      const href = match.startsWith('www.') ? `https://${match}` : match;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    })
    .replace(/\n/g, '<br/>');
  return { html, plain };
}

// ── Selection rectangle (CSS-space percentages 0–100) ─
interface CropRect { x: number; y: number; w: number; h: number }

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (html: string, plainText: string) => void;
}

export default function ImageOCRModal({ open, onClose, onInsert }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mode, setMode] = useState<'all' | 'region'>('all');
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [glowing, setGlowing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Refs for native touch handlers (avoid stale closures)
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const modeRef = useRef<'all' | 'region'>('all');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Reset on close ──
  useEffect(() => {
    if (!open) {
      setImageSrc(null); setMode('all'); setCrop(null);
      setExtractedText(''); setIsProcessing(false);
      setProgress(0); setProgressMsg(''); setError('');
      drawingRef.current = false; startRef.current = null;
      modeRef.current = 'all';
    }
  }, [open]);

  // ── File handling ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
    setError(''); setExtractedText(''); setCrop(null);
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Pointer → percentage coords relative to image container ──
  const toPercent = useCallback((clientX: number, clientY: number) => {
    const el = imgContainerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    };
  }, []);

  // ── Mouse handlers ──
  const onPointerDown = (e: React.MouseEvent) => {
    if (mode !== 'region') return;
    const p = toPercent(e.clientX, e.clientY);
    startRef.current = p; drawingRef.current = true; setCrop(null);
  };
  const onPointerMove = (e: React.MouseEvent) => {
    if (!drawingRef.current || !startRef.current) return;
    const p = toPercent(e.clientX, e.clientY);
    const s = startRef.current;
    setCrop({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const onPointerUp = () => { drawingRef.current = false; startRef.current = null; };

  // ── Native touch handlers (passive:false to prevent scroll) ──
  const onTouchStart = useCallback((e: TouchEvent) => {
    if (modeRef.current !== 'region') return;
    e.preventDefault();
    const t = e.touches[0];
    const el = imgContainerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = {
      x: Math.max(0, Math.min(100, ((t.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((t.clientY - r.top) / r.height) * 100)),
    };
    startRef.current = p; drawingRef.current = true; setCrop(null);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!drawingRef.current || !startRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const el = imgContainerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = {
      x: Math.max(0, Math.min(100, ((t.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((t.clientY - r.top) / r.height) * 100)),
    };
    const s = startRef.current;
    setCrop({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault(); drawingRef.current = false; startRef.current = null;
  }, []);

  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, imageSrc]);

  // ── OCR ──
  const runOCR = async () => {
    if (!imageSrc) return;
    setIsProcessing(true); setProgress(0);
    setProgressMsg('Initializing OCR engine...'); setExtractedText(''); setError('');
    try {
      const Tesseract = await import('tesseract.js');
      let ocrSource: string = imageSrc;

      if (mode === 'region' && crop && imgElRef.current) {
        const img = imgElRef.current;
        // Convert percentage crop to native pixel coords
        const sx = Math.round((crop.x / 100) * img.naturalWidth);
        const sy = Math.round((crop.y / 100) * img.naturalHeight);
        const sw = Math.round((crop.w / 100) * img.naturalWidth);
        const sh = Math.round((crop.h / 100) * img.naturalHeight);
        if (sw > 0 && sh > 0) {
          const c = document.createElement('canvas');
          c.width = sw; c.height = sh;
          const ctx = c.getContext('2d');
          if (ctx) { ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); ocrSource = c.toDataURL('image/png'); }
        }
      }

      const result = await Tesseract.recognize(ocrSource, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') { setProgress(Math.round(m.progress * 100)); setProgressMsg('Recognizing text...'); }
          else setProgressMsg(m.status);
        },
      });

      const text = result.data.text.trim();
      if (!text) { setError('No text detected. Try a clearer image or different region.'); }
      else {
        setExtractedText(text);
        setGlowing(true); setTimeout(() => setGlowing(false), 3000);
        setTimeout(() => { textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); textareaRef.current?.focus(); }, 100);
      }
    } catch (err) { console.error('OCR error:', err); setError('Failed to process image. Please try again.'); }
    finally { setIsProcessing(false); }
  };

  const handleInsert = () => {
    if (!extractedText.trim()) return;
    const { html, plain } = autoLinkText(extractedText);
    onInsert(html, plain); onClose();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div key="ocr-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md" />

          {/* Modal */}
          <motion.div key="ocr-modal"
            initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[70] flex flex-col rounded-2xl border border-[var(--vault-border)] bg-[var(--vault-panel)] shadow-2xl sm:max-w-2xl sm:w-[90vw] sm:max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--vault-border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--vault-gold)]/20 to-amber-500/10">
                  <ScanText className="h-4.5 w-4.5 text-[var(--vault-gold)]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--vault-text)]">Extract Text from Image</h2>
                  <p className="text-[10px] text-[var(--vault-muted)]">Upload an image to extract text via OCR</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--vault-muted)] hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {!imageSrc ? (
                <div onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all duration-200 ${
                    dragOver ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/10 scale-[1.01]'
                      : 'border-[var(--vault-border)] bg-[var(--vault-glass)] hover:border-[var(--vault-gold)]/40 hover:bg-[var(--vault-gold)]/5'
                  }`}
                >
                  <motion.div animate={dragOver ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}} transition={{ duration: 0.4 }}>
                    <Upload className="h-8 w-8 text-[var(--vault-muted)]" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--vault-text)]">
                      Drop an image here or <span className="text-[var(--vault-gold)]">browse</span>
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--vault-muted)]">Supports PNG, JPG, BMP, WebP</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
                </div>
              ) : (
                <>
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={() => { setMode('all'); setCrop(null); }}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 sm:py-1.5 text-xs font-medium transition-all ${
                        mode === 'all' ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/15 text-[var(--vault-gold)]'
                          : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-[var(--vault-gold)]/30'
                      }`}>
                      <ImageIcon className="h-4 w-4 sm:h-3 sm:w-3" /> Extract All
                    </button>
                    <button onClick={() => setMode('region')}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 sm:py-1.5 text-xs font-medium transition-all ${
                        mode === 'region' ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/15 text-[var(--vault-gold)]'
                          : 'border-[var(--vault-border)] text-[var(--vault-muted)] hover:border-[var(--vault-gold)]/30'
                      }`}>
                      <Crop className="h-4 w-4 sm:h-3 sm:w-3" /> Extract Region
                    </button>
                    <button onClick={() => { setImageSrc(null); setExtractedText(''); setCrop(null); setError(''); }}
                      className="ml-auto flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 px-2.5 sm:px-2 py-2 sm:py-1.5 text-[11px] sm:text-[10px] font-medium text-rose-400 transition-colors hover:bg-rose-500/15 hover:border-rose-500/50">
                      <RotateCcw className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> Change
                    </button>
                  </div>

                  {/* Region mode hint */}
                  {mode === 'region' && !crop && (
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--vault-gold)]/20 bg-[var(--vault-gold)]/5 px-3 py-2">
                      <MousePointerSquareDashed className="h-4 w-4 text-[var(--vault-gold)] shrink-0" />
                      <p className="text-[11px] text-[var(--vault-gold)]">
                        Drag on the image to select the region you want to extract text from
                      </p>
                    </div>
                  )}

                  {/* Image with CSS overlay selection */}
                  <div
                    ref={imgContainerRef}
                    onMouseDown={onPointerDown}
                    onMouseMove={onPointerMove}
                    onMouseUp={onPointerUp}
                    onMouseLeave={onPointerUp}
                    className={`relative select-none overflow-hidden rounded-xl border border-[var(--vault-border)] bg-black/20 touch-none ${
                      mode === 'region' ? 'cursor-crosshair' : 'cursor-default'
                    }`}
                  >
                    {/* The actual image — display only, no canvas */}
                    <img
                      ref={imgElRef}
                      src={imageSrc}
                      alt="OCR source"
                      draggable={false}
                      className="block w-full max-h-[55vh] object-contain pointer-events-none"
                      crossOrigin="anonymous"
                    />

                    {/* Dim overlay (outside selected region) */}
                    {mode === 'region' && crop && crop.w > 0.5 && crop.h > 0.5 && (
                      <>
                        {/* Full dim layer */}
                        <div className="absolute inset-0 bg-black/50 pointer-events-none" />

                        {/* Clear cutout for selected region */}
                        <div
                          className="absolute pointer-events-none border-2 border-dashed border-[#c9a84c] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                          style={{
                            left: `${crop.x}%`, top: `${crop.y}%`,
                            width: `${crop.w}%`, height: `${crop.h}%`,
                            background: 'transparent',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                          }}
                        >
                          {/* Corner handles */}
                          <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-sm bg-[#c9a84c]" />
                          <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-sm bg-[#c9a84c]" />
                          <div className="absolute -left-1.5 -bottom-1.5 h-3 w-3 rounded-sm bg-[#c9a84c]" />
                          <div className="absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-sm bg-[#c9a84c]" />
                          {/* Edge midpoint handles */}
                          <div className="absolute left-1/2 -top-1 h-2 w-4 -translate-x-1/2 rounded-sm bg-[#c9a84c]/80" />
                          <div className="absolute left-1/2 -bottom-1 h-2 w-4 -translate-x-1/2 rounded-sm bg-[#c9a84c]/80" />
                          <div className="absolute -left-1 top-1/2 h-4 w-2 -translate-y-1/2 rounded-sm bg-[#c9a84c]/80" />
                          <div className="absolute -right-1 top-1/2 h-4 w-2 -translate-y-1/2 rounded-sm bg-[#c9a84c]/80" />
                          {/* Grid lines (rule of thirds) */}
                          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
                            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#c9a84c]" />
                            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#c9a84c]" />
                            <div className="absolute top-1/3 left-0 right-0 h-px bg-[#c9a84c]" />
                            <div className="absolute top-2/3 left-0 right-0 h-px bg-[#c9a84c]" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {isProcessing && (
                    <div className="overflow-hidden rounded-full bg-[var(--vault-glass)] h-1.5">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-[var(--vault-gold)] to-amber-400"
                        initial={{ width: '0%' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}

                  {/* Extracted Text Preview */}
                  {extractedText && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--vault-muted)]">Extracted Text</p>
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          <Check className="mr-1 inline h-3 w-3" />{extractedText.split(/\s+/).length} words detected
                        </span>
                      </div>
                      <motion.textarea ref={textareaRef} value={extractedText}
                        onChange={(e) => setExtractedText(e.target.value)} rows={30}
                        className={`vault-input w-full resize-y font-mono text-xs leading-relaxed rounded-xl transition-colors duration-500 max-h-[50vh] overflow-y-auto ${
                          glowing ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/5' : ''
                        }`}
                        animate={{ boxShadow: glowing
                          ? ['0 0 0px rgba(201,168,76,0)', '0 0 20px rgba(201,168,76,0.5)', '0 0 8px rgba(201,168,76,0.2)', '0 0 20px rgba(201,168,76,0.5)', '0 0 0px rgba(201,168,76,0)']
                          : '0 0 0px rgba(201,168,76,0)' }}
                        transition={{ boxShadow: glowing ? { duration: 3, ease: 'easeInOut' } : { duration: 0.5 } }}
                        placeholder="Extracted text will appear here..." />
                      <p className="text-[10px] text-[var(--vault-muted)]">You can edit the text above before inserting. URLs will be auto-linked.</p>
                    </motion.div>
                  )}
                </>
              )}
            </div>

            {/* Fixed Extract Button */}
            {imageSrc && (
              <div className="shrink-0 border-t border-[var(--vault-border)] px-5 py-3">
                <button onClick={runOCR} disabled={isProcessing || (mode === 'region' && !crop)}
                  className="vault-btn-primary w-full disabled:opacity-50 !py-2.5">
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />{progressMsg} ({progress}%)
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ScanText className="h-4 w-4" />{mode === 'region' ? 'Extract Selected Region' : 'Extract All Text'}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--vault-border)] px-5 py-3">
              <button onClick={onClose}
                className="rounded-lg border border-[var(--vault-border)] px-4 py-2 text-xs font-medium text-[var(--vault-muted)] transition-colors hover:bg-[var(--vault-glass-hover)]">
                Cancel
              </button>
              <button onClick={handleInsert} disabled={!extractedText.trim()} className="vault-btn-primary disabled:opacity-50">
                <Check className="h-4 w-4" /> Insert Text
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
