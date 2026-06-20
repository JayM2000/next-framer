'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BlockType } from '@/lib/vault/types';

interface SlashMenuItem {
  label: string;
  description: string;
  icon: string;
  type: BlockType;
}

const SLASH_ITEMS: SlashMenuItem[] = [
  { label: 'Text', description: 'Plain text block', icon: '📝', type: 'text' },
  { label: 'Heading 1', description: 'Large heading', icon: 'H₁', type: 'text' },
  { label: 'Heading 2', description: 'Medium heading', icon: 'H₂', type: 'text' },
  { label: 'Image', description: 'Upload or paste image', icon: '🖼️', type: 'image' },
  { label: 'Password', description: 'Secure password block', icon: '🔑', type: 'password' },
  { label: 'Note', description: 'Colored sticky note', icon: '📌', type: 'note' },
  { label: 'Code', description: 'Syntax-highlighted code', icon: '💻', type: 'code' },
  { label: 'Divider', description: 'Horizontal divider', icon: '─', type: 'divider' },
  { label: 'Link', description: 'URL embed with preview', icon: '🔗', type: 'link' },
  { label: 'Session Link', description: 'Link to another session', icon: '📄', type: 'session-embed' },
];

export function useSlashCommand() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredItems = SLASH_ITEMS.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          return filteredItems[selectedIndex];
        }
        break;
    }
    return null;
  }, [isOpen, filteredItems, selectedIndex, close]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return {
    isOpen,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredItems,
    open,
    close,
    handleKeyDown,
    menuRef,
    allItems: SLASH_ITEMS,
  };
}
