'use client';

import { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, Pin, Eye, Calendar } from 'lucide-react';
import type { Session } from '@/lib/vault/types';

interface CanvasTileProps {
  session: Session & { preview?: string; hasPasswords?: boolean };
  isActive: boolean;
  onClick: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  isDragging: boolean;
  style: React.CSSProperties;
}

function CanvasTileInner({
  session,
  isActive,
  onClick,
  onPointerDown,
  isDragging,
  style,
}: CanvasTileProps) {
  const handleClick = useCallback(
    () => {
      // Don't trigger click if we just finished dragging
      if (isDragging) return;
      onClick();
    },
    [isDragging, onClick]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 20px rgba(201,168,76,0.15)'
          : '0 2px 12px rgba(0,0,0,0.2)',
      }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={{
        layout: { type: 'spring', stiffness: 400, damping: 30 },
        scale: { type: 'spring', stiffness: 400, damping: 25 },
        opacity: { duration: 0.2 },
      }}
      style={{
        ...style,
        position: 'absolute',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : 1,
        touchAction: 'none',
      }}
      className={`canvas-tile group select-none ${isActive ? 'canvas-tile-active' : ''}`}
      onClick={handleClick}
      onPointerDown={onPointerDown}
    >
      {/* Tile Content */}
      <div className="canvas-tile-inner">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl leading-none">{session.emoji}</span>
          <h3 className="canvas-tile-title">{session.title}</h3>
        </div>

        {/* Preview text */}
        {session.preview && (
          <p className="canvas-tile-preview">{session.preview}</p>
        )}

        {/* Tags */}
        {session.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {session.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="canvas-tile-tag"
                style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
              >
                {tag.label}
              </span>
            ))}
            {session.tags.length > 3 && (
              <span className="canvas-tile-tag" style={{ color: 'var(--vault-muted)' }}>
                +{session.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: badges & meta */}
        <div className="canvas-tile-footer">
          <div className="flex items-center gap-2">
            {session.isPinned && (
              <Pin className="h-3 w-3 text-[var(--vault-gold)]" />
            )}
            {session.isEncrypted && (
              <Lock className="h-3 w-3 text-[var(--vault-gold)]" />
            )}
            {session.hasPasswords && (
              <Lock className="h-3 w-3 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--vault-muted)]">
            {session.viewCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" />
                {session.viewCount}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(session.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="canvas-tile-glow" />
    </motion.div>
  );
}

const CanvasTile = memo(CanvasTileInner);
export default CanvasTile;
