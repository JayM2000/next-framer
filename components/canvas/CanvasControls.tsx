'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';

interface CanvasControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
  onReset: () => void;
  sessionCount: number;
}

function CanvasControlsInner({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitAll,
  onReset,
  sessionCount,
}: CanvasControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.25 }}
      className="canvas-controls"
    >
      {/* Zoom controls */}
      <div className="canvas-controls-group">
        <button
          onClick={onZoomOut}
          className="canvas-control-btn"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>

        <span className="canvas-zoom-label">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={onZoomIn}
          className="canvas-control-btn"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      <div className="canvas-controls-divider" />

      {/* View controls */}
      <div className="canvas-controls-group">
        <button
          onClick={onFitAll}
          className="canvas-control-btn"
          title="Fit all sessions"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={onReset}
          className="canvas-control-btn"
          title="Reset view"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Session count */}
      <div className="canvas-controls-divider" />
      <span className="canvas-session-count">
        {sessionCount} session{sessionCount !== 1 ? 's' : ''}
      </span>
    </motion.div>
  );
}

const CanvasControls = memo(CanvasControlsInner);
export default CanvasControls;
