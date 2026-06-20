'use client';

import type { TextBlockContent } from '@/lib/vault/types';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';

interface TextBlockProps {
  content: TextBlockContent;
  onChange: (content: TextBlockContent) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function TextBlock({ content, onChange, placeholder = 'Type something...', autoFocus = false }: TextBlockProps) {
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content.html || '',
    autofocus: autoFocus,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'canvas-text-block focus:outline-none min-h-[1.5em] px-1 py-0.5',
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      const html = editor.getHTML();
      const plainText = editor.getText();
      onChange({ html, plainText });
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content.html !== editor.getHTML()) {
      isUpdatingRef.current = true;
      editor.commands.setContent(content.html);
      isUpdatingRef.current = false;
    }
  }, [content.html, editor]);

  if (!editor) return null;

  return (
    <div className="text-block-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}
