'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { trpc } from '@/trpc/client';
import { useVault } from '@/lib/vault/store';
import { usePresence } from '@/hooks/usePresence';
import { useSlashCommand } from '@/hooks/useSlashCommand';
import CanvasHeader from './CanvasHeader';
import BlockWrapper from '@/components/blocks/BlockWrapper';
import TextBlock from '@/components/blocks/TextBlock';
import ImageBlock from '@/components/blocks/ImageBlock';
import PasswordBlock from '@/components/blocks/PasswordBlock';
import NoteBlock from '@/components/blocks/NoteBlock';
import CodeBlock from '@/components/blocks/CodeBlock';
import DividerBlock from '@/components/blocks/DividerBlock';
import LinkBlock from '@/components/blocks/LinkBlock';
import SessionLinkBlock from '@/components/blocks/SessionLinkBlock';
import SlashCommandMenu from '@/components/blocks/SlashCommandMenu';
import type {
  SessionBlock,
  TextBlockContent,
  ImageBlockContent,
  PasswordBlockContent,
  NoteBlockContent,
  CodeBlockContent,
  DividerBlockContent,
  LinkBlockContent,
  SessionEmbedBlockContent,
  BlockType,
} from '@/lib/vault/types';
import { Loader2 } from 'lucide-react';

interface CanvasEditorProps {
  sessionId: string;
  onNavigateHome: () => void;
  onNavigateSession: (id: string) => void;
}

export default function CanvasEditor({ sessionId, onNavigateHome, onNavigateSession }: CanvasEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { currentDbUserId: _currentDbUserId } = useVault();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | undefined>();

  // tRPC queries
  const utils = trpc.useUtils();
  const { data: session, isLoading } = trpc.sessions.getSession.useQuery(
    { id: sessionId },
    { refetchOnWindowFocus: false }
  );

  // Mutations
  const createBlock = trpc.sessions.createBlock.useMutation({
    onSuccess: () => utils.sessions.getSession.invalidate({ id: sessionId }),
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _updateBlock = trpc.sessions.updateBlock.useMutation();
  const deleteBlock = trpc.sessions.deleteBlock.useMutation({
    onSuccess: () => utils.sessions.getSession.invalidate({ id: sessionId }),
  });
  const batchUpdate = trpc.sessions.batchUpdateBlocks.useMutation();

  // Presence
  const { viewers, setEditing } = usePresence(sessionId);

  // Slash command
  const slash = useSlashCommand();

  // Debounced block update
  const handleBlockChange = useCallback(
    (blockId: string, content: Record<string, unknown>) => {
      setEditing(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        batchUpdate.mutate({
          sessionId,
          blocks: [{ id: blockId, content }],
        });
        setEditing(false);
      }, 500);
    },
    [sessionId, batchUpdate, setEditing]
  );

  // Add block
  const handleAddBlock = useCallback(
    (type: BlockType, position?: number) => {
      const defaultContent: Record<BlockType, Record<string, unknown>> = {
        text: { html: '', plainText: '' },
        image: { url: '', alt: '', caption: '' },
        password: { label: '', username: '', encryptedPassword: '', url: '', notes: '' },
        note: { title: '', body: '', color: '#D4A827' },
        code: { language: 'javascript', code: '' },
        divider: { style: 'gradient' },
        link: { url: '', title: '', description: '', favicon: '' },
        'session-embed': { targetSessionId: '', targetTitle: '', preview: '' },
      };

      createBlock.mutate({
        sessionId,
        type,
        content: defaultContent[type],
        position,
      });
      slash.close();
    },
    [sessionId, createBlock, slash]
  );

  // Delete block
  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      deleteBlock.mutate({ id: blockId });
    },
    [deleteBlock]
  );

  // Render a block by type
  const renderBlock = useCallback(
    (block: SessionBlock) => {
      switch (block.type) {
        case 'text':
          return (
            <TextBlock
              content={block.content as unknown as TextBlockContent}
              onChange={(c) => handleBlockChange(block.id, c as unknown as Record<string, unknown>)}
            />
          );
        case 'image':
          return (
            <ImageBlock
              content={block.content as unknown as ImageBlockContent}
              onChange={(c) => handleBlockChange(block.id, c as unknown as Record<string, unknown>)}
            />
          );
        case 'password':
          return (
            <PasswordBlock
              content={block.content as unknown as PasswordBlockContent}
              onChange={(c) => handleBlockChange(block.id, c as unknown as Record<string, unknown>)}
            />
          );
        case 'note':
          return (
            <NoteBlock
              content={block.content as unknown as NoteBlockContent}
              onChange={(c) => handleBlockChange(block.id, c as unknown as Record<string, unknown>)}
            />
          );
        case 'code':
          return (
            <CodeBlock
              content={block.content as unknown as CodeBlockContent}
              onChange={(c) => handleBlockChange(block.id, c as unknown as Record<string, unknown>)}
            />
          );
        case 'divider':
          return (
            <DividerBlock
              content={block.content as unknown as DividerBlockContent}
              onChange={(c) => handleBlockChange(block.id, c as unknown as Record<string, unknown>)}
            />
          );
        case 'link':
          return (
            <LinkBlock
              content={block.content as unknown as LinkBlockContent}
              onChange={(c) => handleBlockChange(block.id, c as unknown as Record<string, unknown>)}
            />
          );
        case 'session-embed':
          return (
            <SessionLinkBlock
              content={block.content as unknown as SessionEmbedBlockContent}
              onNavigate={onNavigateSession}
            />
          );
        default:
          return <div className="text-xs text-[var(--vault-muted)]">Unknown block type: {block.type}</div>;
      }
    },
    [handleBlockChange, onNavigateSession]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--vault-gold)]" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-[var(--vault-muted)]">Session not found</p>
        <button onClick={onNavigateHome} className="text-xs text-[var(--vault-gold)] hover:underline">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <motion.div
      key={sessionId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="flex-1 overflow-y-auto"
    >
      <div className="mx-auto max-w-[760px] px-6 py-8 pb-32">
        {/* Session header */}
        <CanvasHeader
          session={session}
          viewers={viewers}
          currentUserId={null}
          onNavigateHome={onNavigateHome}
        />

        {/* Blocks */}
        <div className="relative pl-10 pr-10 space-y-1 mt-6">
          <AnimatePresence mode="popLayout">
            {session.blocks.map((block, i) => (
              <BlockWrapper
                key={block.id}
                blockId={block.id}
                onAddBelow={() => {
                  setSlashMenuPos(undefined);
                  handleAddBlock('text', block.position + 1);
                }}
                onDelete={() => handleDeleteBlock(block.id)}
                onDuplicate={() => {
                  createBlock.mutate({
                    sessionId,
                    type: block.type,
                    content: block.content,
                    position: block.position + 1,
                  });
                }}
                onMoveUp={i > 0 ? () => {
                  // TODO: reorder
                } : undefined}
                onMoveDown={i < session.blocks.length - 1 ? () => {
                  // TODO: reorder
                } : undefined}
              >
                {renderBlock(block)}
              </BlockWrapper>
            ))}
          </AnimatePresence>
        </div>

        {/* Add block prompt */}
        <div className="relative pl-10 mt-4">
          <button
            onClick={() => {
              slash.open();
              setSlashMenuPos(undefined);
            }}
            className="text-xs text-[var(--vault-muted)] hover:text-[var(--vault-gold)] transition-colors cursor-pointer"
          >
            Type <span className="font-mono bg-[var(--vault-panel)] px-1 rounded">/</span> to add a block...
          </button>
        </div>

        {/* Slash command menu */}
        <SlashCommandMenu
          isOpen={slash.isOpen}
          items={slash.filteredItems}
          selectedIndex={slash.selectedIndex}
          onSelect={(item) => handleAddBlock(item.type)}
          onClose={slash.close}
          position={slashMenuPos}
        />

        {/* Backlinks */}
        {session.backlinks.length > 0 && (
          <div className="mt-12 pl-10 border-t border-[var(--vault-border)] pt-6">
            <h3 className="text-xs font-semibold text-[var(--vault-muted)] uppercase tracking-wider mb-3">
              Backlinks
            </h3>
            <div className="space-y-2">
              {session.backlinks.map((bl) => (
                <button
                  key={bl.sessionId}
                  onClick={() => onNavigateSession(bl.sessionId)}
                  className="flex items-center gap-2 text-xs text-[var(--vault-text)] hover:text-[var(--vault-gold)] transition-colors"
                >
                  <span>{bl.emoji}</span>
                  <span>{bl.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
