'use client';

import { type Editor } from '@tiptap/react';
import { useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, Quote,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, Highlighter, Code, RemoveFormatting, Smile, Image as ImageIcon, Minus
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface Props {
  editor: Editor | null;
}

const TEXT_COLORS = [
  '#f0ead6', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

const HIGHLIGHT_COLORS = [
  'transparent', '#fef08a80', '#fca5a580', '#86efac80',
  '#7dd3fc80', '#c4b5fd80', '#f9a8d480',
];

export default function EditorToolbar({ editor }: Props) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  if (!editor) return null;

  const ToolBtn = ({
    active,
    onClick,
    children,
    title,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-[var(--vault-gold)] text-[#0a0a0f]'
          : 'text-[var(--vault-muted)] hover:bg-[var(--vault-glass-hover)] hover:text-[var(--vault-text)]'
      }`}
    >
      {children}
    </button>
  );

  const Separator = () => <div className="mx-1 h-5 w-px bg-[var(--vault-border)]" />;

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          editor.chain().focus().setImage({ src: reader.result as string }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--vault-border)] px-2 py-1.5">
      {/* Row 1 — Formatting */}
      <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <Underline className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolBtn>
      <Separator />
      <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <Heading1 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <Heading3 className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        <Quote className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      {/* Row 2 — Lists & Align */}
      <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />
      <ToolBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
        <AlignRight className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      {/* Row 3 — Color & Style */}
      <div className="relative">
        <ToolBtn onClick={() => { setShowTextColor(!showTextColor); setShowHighlight(false); }} title="Text Color">
          <Palette className="h-3.5 w-3.5" />
        </ToolBtn>
        {showTextColor && (
          <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded-lg border border-[var(--vault-border)] bg-[var(--vault-panel)] p-1.5 shadow-xl">
            {TEXT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => { editor.chain().focus().setColor(color).run(); setShowTextColor(false); }}
                className="h-5 w-5 rounded-full border border-[var(--vault-border)] transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <ToolBtn onClick={() => { setShowHighlight(!showHighlight); setShowTextColor(false); }} title="Highlight">
          <Highlighter className="h-3.5 w-3.5" />
        </ToolBtn>
        {showHighlight && (
          <div className="absolute top-full left-0 z-50 mt-1 flex gap-1 rounded-lg border border-[var(--vault-border)] bg-[var(--vault-panel)] p-1.5 shadow-xl">
            {HIGHLIGHT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => { editor.chain().focus().toggleHighlight({ color }).run(); setShowHighlight(false); }}
                className="h-5 w-5 rounded-full border border-[var(--vault-border)] transition-transform hover:scale-110"
                style={{ backgroundColor: color === 'transparent' ? 'var(--vault-glass)' : color }}
              />
            ))}
          </div>
        )}
      </div>
      <ToolBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
        <Code className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear Formatting">
        <RemoveFormatting className="h-3.5 w-3.5" />
      </ToolBtn>

      <Separator />

      {/* Row 4 — Insert */}
      <div className="relative">
        <ToolBtn onClick={() => { setShowEmoji(!showEmoji); setShowTextColor(false); setShowHighlight(false); }} title="Emoji">
          <Smile className="h-3.5 w-3.5" />
        </ToolBtn>
        {showEmoji && (
          <EmojiPicker
            onSelect={(emoji) => editor.chain().focus().insertContent(emoji).run()}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </div>
      <ToolBtn onClick={addImage} title="Insert Image">
        <ImageIcon className="h-3.5 w-3.5" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
        <Minus className="h-3.5 w-3.5" />
      </ToolBtn>
    </div>
  );
}
