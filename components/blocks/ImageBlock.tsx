'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import type { ImageBlockContent } from '@/lib/vault/types';

interface ImageBlockProps {
  content: ImageBlockContent;
  onChange: (content: ImageBlockContent) => void;
}

export default function ImageBlock({ content, onChange }: ImageBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({
        ...content,
        url: reader.result as string,
        alt: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, [content, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  }, [handleFile]);

  if (!content.url) {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onPaste={handlePaste}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-all ${
          isDragOver
            ? 'border-[var(--vault-gold)] bg-[var(--vault-gold)]/5'
            : 'border-[var(--vault-border)] hover:border-[var(--vault-gold)]/30 hover:bg-[var(--vault-panel)]'
        }`}
        tabIndex={0}
      >
        <Upload className={`h-8 w-8 ${isDragOver ? 'text-[var(--vault-gold)]' : 'text-[var(--vault-muted)]'}`} />
        <p className="text-xs text-[var(--vault-muted)]">
          Click, drag, or paste an image
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>
    );
  }

  return (
    <div className="relative group/img rounded-lg overflow-hidden">
      <img
        src={content.url}
        alt={content.alt}
        className="w-full rounded-lg"
        style={{
          maxWidth: content.width || '100%',
          maxHeight: 500,
          objectFit: 'contain',
        }}
      />
      
      {/* Remove image button */}
      <button
        onClick={() => onChange({ ...content, url: '', alt: '' })}
        className="absolute top-2 right-2 p-1 rounded bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Caption */}
      <input
        type="text"
        value={content.caption}
        onChange={(e) => onChange({ ...content, caption: e.target.value })}
        placeholder="Add a caption..."
        className="w-full mt-2 bg-transparent text-xs text-[var(--vault-muted)] text-center focus:outline-none focus:text-[var(--vault-text)] transition-colors"
      />
    </div>
  );
}
