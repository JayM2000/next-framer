'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAutocorrect } from '@/lib/vault/autocorrect';
import EditorToolbar from './EditorToolbar';

interface Props {
  content: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
}

export default function RichEditor({ content, onChange, placeholder }: Props) {
  const [mounted, setMounted] = useState(false);
  const lastWordRef = useRef('');
  const correctionTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAutocorrect = useCallback((editor: ReturnType<typeof useEditor>) => {
    if (!editor) return;

    const { state } = editor;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, ' ');
    const words = textBefore.split(/\s+/);
    const lastWord = words[words.length - 2];

    if (lastWord && lastWord !== lastWordRef.current) {
      const correction = checkAutocorrect(lastWord);
      if (correction) {
        const wordStart = from - lastWord.length - 1;
        if (wordStart >= 0) {
          editor.chain()
            .focus()
            .deleteRange({ from: wordStart, to: wordStart + lastWord.length })
            .insertContentAt(wordStart, correction)
            .run();
        }
      }
    }
    lastWordRef.current = lastWord || '';
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Image.configure({ inline: true }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'vault-editor-content prose prose-sm max-w-none outline-none min-h-[120px] px-3 py-2',
        'data-placeholder': placeholder || 'Start writing...',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const text = ed.getText();
      onChange(html, text);

      if (correctionTimeoutRef.current) clearTimeout(correctionTimeoutRef.current);
      correctionTimeoutRef.current = setTimeout(() => handleAutocorrect(ed), 100);
    },
  });

  useEffect(() => {
    if (editor && typeof content === 'string') {
      const currentHtml = editor.getHTML();
      if (currentHtml !== content) {
        // Prevent unnecessary updates if parent passes '' and editor is already effectively empty
        if (content === '' && currentHtml === '<p></p>') return;
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!mounted) {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--vault-border)] bg-[var(--vault-glass)]">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--vault-border)] px-2 py-1.5 h-9" />
        <div className="min-h-[120px] px-3 py-2 text-sm text-[var(--vault-muted)]">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--vault-border)] bg-[var(--vault-glass)] focus-within:border-[var(--vault-gold)] focus-within:ring-1 focus-within:ring-[var(--vault-gold)] transition-colors">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
