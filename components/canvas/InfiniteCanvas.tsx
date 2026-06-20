'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { trpc } from '@/trpc/client';
import CanvasTile from './CanvasTile';
import CanvasControls from './CanvasControls';
import type { Session } from '@/lib/vault/types';

// ── Constants ──────────────────────────────────────────────

const TILE_WIDTH = 240;
const TILE_HEIGHT = 160;
const TILE_GAP = 32;
const GRID_COLS = 4;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.15;
const SAVE_DEBOUNCE_MS = 600;

// ── Types ──────────────────────────────────────────────────

interface TilePosition {
  x: number;
  y: number;
}

interface CanvasViewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

interface InfiniteCanvasProps {
  sessions: (Session & { preview?: string; hasPasswords?: boolean })[];
  activeSessionId: string | null;
  onOpenSession: (sessionId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────

function getDefaultPosition(index: number): TilePosition {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return {
    x: col * (TILE_WIDTH + TILE_GAP) + TILE_GAP,
    y: row * (TILE_HEIGHT + TILE_GAP) + TILE_GAP,
  };
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  padding = 8
): boolean {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

function findNonOverlappingPosition(
  targetRect: { x: number; y: number; w: number; h: number },
  otherRects: { x: number; y: number; w: number; h: number }[],
  maxAttempts = 64
): TilePosition {
  // Spiral search outward from the drop position
  const stepX = TILE_WIDTH + TILE_GAP;
  const stepY = TILE_HEIGHT + TILE_GAP;

  for (let ring = 1; ring <= maxAttempts; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        const candidate = {
          x: targetRect.x + dx * stepX,
          y: targetRect.y + dy * stepY,
          w: targetRect.w,
          h: targetRect.h,
        };
        const hasOverlap = otherRects.some((r) => rectsOverlap(candidate, r));
        if (!hasOverlap) {
          return { x: candidate.x, y: candidate.y };
        }
      }
    }
  }

  // Fallback: place far to the right
  return { x: targetRect.x + maxAttempts * stepX, y: targetRect.y };
}

// ── Component ──────────────────────────────────────────────

export default function InfiniteCanvas({
  sessions,
  activeSessionId,
  onOpenSession,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragDidMoveRef = useRef(false);

  // ── Viewport state ──
  const [viewport, setViewport] = useState<CanvasViewport>({
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  });

  // ── Tile positions ──
  const [positions, setPositions] = useState<Map<string, TilePosition>>(
    new Map()
  );

  // ── Drag state ──
  const [dragState, setDragState] = useState<{
    tileId: string;
    startX: number;
    startY: number;
    startTileX: number;
    startTileY: number;
  } | null>(null);

  // ── Pan state ──
  const [panState, setPanState] = useState<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  // ── tRPC mutation for saving positions ──
  const updatePosition = trpc.sessions.updateSessionPosition.useMutation();

  // ── Initialize positions from session data ──
  useEffect(() => {
    setPositions((prev) => {
      const next = new Map(prev);
      let changed = false;

      sessions.forEach((session, index) => {
        if (!next.has(session.id)) {
          // Use saved DB position, or auto-assign grid position
          const pos =
            session.canvasX !== null && session.canvasY !== null
              ? { x: session.canvasX, y: session.canvasY }
              : getDefaultPosition(index);
          next.set(session.id, pos);
          changed = true;
        }
      });

      // Remove positions for deleted sessions
      for (const id of next.keys()) {
        if (!sessions.some((s) => s.id === id)) {
          next.delete(id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [sessions]);

  // ── Save position to DB (debounced) ──
  const savePosition = useCallback(
    (tileId: string, x: number, y: number) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updatePosition.mutate({ id: tileId, canvasX: x, canvasY: y });
      }, SAVE_DEBOUNCE_MS);
    },
    [updatePosition]
  );

  // ── Tile drag handlers ──
  const handleTilePointerDown = useCallback(
    (tileId: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDidMoveRef.current = false;

      const pos = positions.get(tileId);
      if (!pos) return;

      setDragState({
        tileId,
        startX: e.clientX,
        startY: e.clientY,
        startTileX: pos.x,
        startTileY: pos.y,
      });

      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [positions]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / viewport.zoom;
        const dy = (e.clientY - dragState.startY) / viewport.zoom;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragDidMoveRef.current = true;
        }

        setPositions((prev) => {
          const next = new Map(prev);
          next.set(dragState.tileId, {
            x: dragState.startTileX + dx,
            y: dragState.startTileY + dy,
          });
          return next;
        });
        return;
      }

      if (panState) {
        const dx = e.clientX - panState.startX;
        const dy = e.clientY - panState.startY;
        setViewport((prev) => ({
          ...prev,
          offsetX: panState.startOffsetX + dx,
          offsetY: panState.startOffsetY + dy,
        }));
      }
    },
    [dragState, panState, viewport.zoom]
  );

  const handlePointerUp = useCallback(
    () => {
      if (dragState) {
        const pos = positions.get(dragState.tileId);
        if (pos && dragDidMoveRef.current) {
          // Check for overlap with other tiles
          const otherRects = Array.from(positions.entries())
            .filter(([id]) => id !== dragState.tileId)
            .map(([, p]) => ({
              x: p.x,
              y: p.y,
              w: TILE_WIDTH,
              h: TILE_HEIGHT,
            }));

          const myRect = {
            x: pos.x,
            y: pos.y,
            w: TILE_WIDTH,
            h: TILE_HEIGHT,
          };

          const hasOverlap = otherRects.some((r) => rectsOverlap(myRect, r));

          if (hasOverlap) {
            // Find nearest non-overlapping position
            const newPos = findNonOverlappingPosition(myRect, otherRects);
            setPositions((prev) => {
              const next = new Map(prev);
              next.set(dragState.tileId, newPos);
              return next;
            });
            savePosition(dragState.tileId, newPos.x, newPos.y);
          } else {
            savePosition(dragState.tileId, pos.x, pos.y);
          }
        }

        setDragState(null);
        // Reset drag flag after a tick so click handler can check it
        requestAnimationFrame(() => {
          dragDidMoveRef.current = false;
        });
        return;
      }

      if (panState) {
        setPanState(null);
      }
    },
    [dragState, panState, positions, savePosition]
  );

  // ── Canvas pan (pointerdown on empty space) ──
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only start pan if clicking directly on the canvas background
      if (e.target !== e.currentTarget) return;
      if (e.button !== 0) return; // left click only

      setPanState({
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: viewport.offsetX,
        startOffsetY: viewport.offsetY,
      });
    },
    [viewport.offsetX, viewport.offsetY]
  );

  // ── Zoom (wheel) ──
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setViewport((prev) => {
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev.zoom + delta));

        // Zoom toward cursor position
        const container = containerRef.current;
        if (!container) return { ...prev, zoom: newZoom };

        const rect = container.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        // Adjust offset to keep the point under cursor stable
        const scaleRatio = newZoom / prev.zoom;
        const newOffsetX = cursorX - scaleRatio * (cursorX - prev.offsetX);
        const newOffsetY = cursorY - scaleRatio * (cursorY - prev.offsetY);

        return {
          offsetX: newOffsetX,
          offsetY: newOffsetY,
          zoom: newZoom,
        };
      });
    },
    []
  );

  // ── Zoom controls ──
  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom + ZOOM_STEP),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom - ZOOM_STEP),
    }));
  }, []);

  const handleReset = useCallback(() => {
    setViewport({ offsetX: 0, offsetY: 0, zoom: 1 });
  }, []);

  const handleFitAll = useCallback(() => {
    if (positions.size === 0 || !containerRef.current) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    positions.forEach((pos) => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + TILE_WIDTH);
      maxY = Math.max(maxY, pos.y + TILE_HEIGHT);
    });

    const rect = containerRef.current.getBoundingClientRect();
    const contentWidth = maxX - minX + TILE_GAP * 2;
    const contentHeight = maxY - minY + TILE_GAP * 2;

    const scaleX = rect.width / contentWidth;
    const scaleY = rect.height / contentHeight;
    const zoom = Math.min(Math.max(MIN_ZOOM, Math.min(scaleX, scaleY) * 0.9), MAX_ZOOM);

    const offsetX = (rect.width - contentWidth * zoom) / 2 - minX * zoom + TILE_GAP * zoom;
    const offsetY = (rect.height - contentHeight * zoom) / 2 - minY * zoom + TILE_GAP * zoom;

    setViewport({ offsetX, offsetY, zoom });
  }, [positions]);

  // ── Canvas grid dots pattern ──
  const gridSize = 24 * viewport.zoom;
  const gridOffsetX = viewport.offsetX % gridSize;
  const gridOffsetY = viewport.offsetY % gridSize;

  // ── Memoize tile render data ──
  const tilesWithPositions = useMemo(() => {
    return sessions.map((session) => ({
      session,
      position: positions.get(session.id) ?? getDefaultPosition(0),
    }));
  }, [sessions, positions]);

  return (
    <div className="infinite-canvas-container" ref={containerRef}>
      {/* Grid dots background */}
      <div
        className="infinite-canvas-grid"
        style={{
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
        }}
      />

      {/* Canvas surface */}
      <div
        className="infinite-canvas-surface"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        style={{
          cursor: panState ? 'grabbing' : 'default',
        }}
      >
        {/* Transformed layer */}
        <div
          className="infinite-canvas-transform"
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <AnimatePresence>
            {tilesWithPositions.map(({ session, position }) => (
              <CanvasTile
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onClick={() => onOpenSession(session.id)}
                onPointerDown={(e) => handleTilePointerDown(session.id, e)}
                isDragging={dragState?.tileId === session.id}
                style={{
                  left: position.x,
                  top: position.y,
                  width: TILE_WIDTH,
                  height: TILE_HEIGHT,
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls overlay */}
      <CanvasControls
        zoom={viewport.zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitAll={handleFitAll}
        onReset={handleReset}
        sessionCount={sessions.length}
      />

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="infinite-canvas-empty">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-sm text-[var(--vault-muted)] mb-2">
            No sessions yet
          </p>
          <p className="text-xs text-[var(--vault-muted)]">
            Click{' '}
            <span className="text-[var(--vault-gold)] font-semibold">
              + New Session
            </span>{' '}
            in the sidebar to get started
          </p>
        </div>
      )}
    </div>
  );
}
