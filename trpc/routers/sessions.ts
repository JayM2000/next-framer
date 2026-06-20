import { query, withTransaction } from "@/db";
import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { encryptItemFieldsServer, decryptItemFieldsServer } from "@/lib/vault/server-crypto";

// ── Zod Schemas ──────────────────────────────────────────────

const createSessionSchema = z.object({
  title: z.string().max(500).default("Untitled Session"),
  emoji: z.string().max(10).default("📄"),
  isPublic: z.boolean().default(false),
  parentId: z.string().uuid().optional(),
});

const updateSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(500).optional(),
  emoji: z.string().max(10).optional(),
  isPublic: z.boolean().optional(),
  isEncrypted: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  position: z.number().optional(),
});

const blockContentSchema = z.record(z.string(), z.unknown());

const createBlockSchema = z.object({
  sessionId: z.string().uuid(),
  type: z.enum(["text", "image", "password", "note", "divider", "code", "link", "session-embed"]),
  content: blockContentSchema.default({}),
  position: z.number().optional(),
});

const updateBlockSchema = z.object({
  id: z.string().uuid(),
  content: blockContentSchema.optional(),
  type: z.enum(["text", "image", "password", "note", "divider", "code", "link", "session-embed"]).optional(),
});

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    position: z.number(),
  })),
});

const tagSchema = z.object({
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8b5cf6"),
});

const updateSessionTagsSchema = z.object({
  sessionId: z.string().uuid(),
  tags: z.array(tagSchema),
});

// ── Row types ──────────────────────────────────────────────

interface SessionRow {
  id: string;
  title: string;
  emoji: string;
  owner_id: number | null;
  is_public: boolean;
  is_encrypted: boolean;
  encrypted_key: string | null;
  tags: string[];
  position: number;
  parent_id: string | null;
  copy_count: number;
  view_count: number;
  is_deleted: boolean;
  is_pinned: boolean;
  last_visited_at: Date | null;
  canvas_x: number | null;
  canvas_y: number | null;
  created_at: Date;
  updated_at: Date;
}

interface BlockRow {
  id: string;
  session_id: string;
  type: string;
  content: Record<string, unknown>;
  position: number;
  is_encrypted: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

interface TagRow {
  id: number;
  label: string;
  color: string;
}

interface SessionTagRow {
  session_id: string;
  tag_id: number;
  label: string;
  color: string;
}

// ── Helper: resolve user ID from clerk ────────────────────

async function resolveUserId(clerkUserId: string): Promise<number> {
  const rows = await query<{ id: number }>(
    `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
    [clerkUserId]
  );
  if (!rows.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found in database" });
  }
  return rows[0].id;
}

async function optionalUserId(clerkUserId: string | null | undefined): Promise<number | null> {
  if (!clerkUserId) return null;
  const rows = await query<{ id: number }>(
    `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
    [clerkUserId]
  );
  return rows.length ? rows[0].id : null;
}

// ── Helper: format session row ────────────────────────────

function formatSession(row: SessionRow, tags: { id: number; label: string; color: string }[] = []) {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    ownerId: row.owner_id,
    isPublic: row.is_public,
    isEncrypted: row.is_encrypted,
    tags: tags.map(t => ({ id: String(t.id), label: t.label, color: t.color })),
    position: row.position,
    parentId: row.parent_id,
    copyCount: row.copy_count,
    viewCount: row.view_count,
    isDeleted: row.is_deleted,
    isPinned: row.is_pinned,
    lastVisitedAt: row.last_visited_at?.toISOString() ?? null,
    canvasX: row.canvas_x ?? null,
    canvasY: row.canvas_y ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function formatBlock(row: BlockRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    type: row.type as "text" | "image" | "password" | "note" | "divider" | "code" | "link" | "session-embed",
    content: row.content,
    position: row.position,
    isEncrypted: row.is_encrypted,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ══════════════════════════════════════════════════════════
//  SESSIONS ROUTER
// ══════════════════════════════════════════════════════════

export const sessionsRouter = createTRPCRouter({

  // ── Get all sessions for sidebar ────────────────────────
  getSessions: baseProcedure.query(async ({ ctx }) => {
    const userId = await optionalUserId(ctx.clerkUserId);

    let sessions: SessionRow[];
    if (userId) {
      sessions = await query<SessionRow>(
        `SELECT * FROM sessions
         WHERE owner_id = $1 AND is_deleted = FALSE
         ORDER BY position ASC, created_at DESC`,
        [userId]
      );
    } else {
      // Anonymous: show only public sessions
      sessions = await query<SessionRow>(
        `SELECT * FROM sessions
         WHERE is_public = TRUE AND is_deleted = FALSE
         ORDER BY view_count DESC, created_at DESC
         LIMIT 50`
      );
    }

    // Fetch tags for all sessions
    const sessionIds = sessions.map(s => s.id);
    let allTags: SessionTagRow[] = [];
    if (sessionIds.length > 0) {
      allTags = await query<SessionTagRow>(
        `SELECT st.session_id, vt.id AS tag_id, vt.label, vt.color
         FROM session_tags st
         JOIN vault_tags vt ON vt.id = st.tag_id
         WHERE st.session_id = ANY($1)`,
        [sessionIds]
      );
    }

    const tagsBySession = new Map<string, { id: number; label: string; color: string }[]>();
    for (const row of allTags) {
      const arr = tagsBySession.get(row.session_id) ?? [];
      arr.push({ id: row.tag_id, label: row.label, color: row.color });
      tagsBySession.set(row.session_id, arr);
    }

    return sessions.map(s => formatSession(s, tagsBySession.get(s.id) ?? []));
  }),

  // ── Get single session with blocks ──────────────────────
  getSession: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      const sessions = await query<SessionRow>(
        `SELECT * FROM sessions WHERE id = $1 LIMIT 1`,
        [input.id]
      );

      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const session = sessions[0];

      // Access check: private sessions only visible to owner
      if (!session.is_public && session.owner_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Update view count and last visited
      if (userId && session.owner_id === userId) {
        await query(
          `UPDATE sessions SET view_count = view_count + 1, last_visited_at = NOW() WHERE id = $1`,
          [input.id]
        );
      } else {
        await query(
          `UPDATE sessions SET view_count = view_count + 1 WHERE id = $1`,
          [input.id]
        );
      }

      // Fetch tags
      const tags = await query<SessionTagRow>(
        `SELECT st.session_id, vt.id AS tag_id, vt.label, vt.color
         FROM session_tags st
         JOIN vault_tags vt ON vt.id = st.tag_id
         WHERE st.session_id = $1`,
        [input.id]
      );

      // Fetch blocks
      const blocks = await query<BlockRow>(
        `SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY position ASC`,
        [input.id]
      );

      // Fetch backlinks (sessions that link TO this session)
      const backlinks = await query<{ source_session_id: string; title: string; emoji: string }>(
        `SELECT sl.source_session_id, s.title, s.emoji
         FROM session_links sl
         JOIN sessions s ON s.id = sl.source_session_id
         WHERE sl.target_session_id = $1 AND s.is_deleted = FALSE`,
        [input.id]
      );

      return {
        ...formatSession(session, tags.map(t => ({ id: t.tag_id, label: t.label, color: t.color }))),
        blocks: blocks.map(formatBlock),
        backlinks: backlinks.map(b => ({
          sessionId: b.source_session_id,
          title: b.title,
          emoji: b.emoji,
        })),
      };
    }),

  // ── Create new session ──────────────────────────────────
  createSession: baseProcedure
    .input(createSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      // Get max position for ordering
      let maxPosition = 0;
      if (userId) {
        const result = await query<{ max_pos: number }>(
          `SELECT COALESCE(MAX(position), -1) as max_pos FROM sessions WHERE owner_id = $1`,
          [userId]
        );
        maxPosition = result[0].max_pos + 1;
      }

      const sessions = await query<SessionRow>(
        `INSERT INTO sessions (title, emoji, owner_id, is_public, parent_id, position)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [input.title, input.emoji, userId, userId ? input.isPublic : true, input.parentId ?? null, maxPosition]
      );

      const session = sessions[0];

      // Create a default empty text block
      await query(
        `INSERT INTO session_blocks (session_id, type, content, position, created_by)
         VALUES ($1, 'text', $2, 0, $3)`,
        [session.id, JSON.stringify({ html: '', plainText: '' }), userId]
      );

      return formatSession(session);
    }),

  // ── Update session metadata ─────────────────────────────
  updateSession: protectedProcedure
    .input(updateSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.dbUserId;

      // Verify ownership
      const existing = await query<SessionRow>(
        `SELECT * FROM sessions WHERE id = $1 AND owner_id = $2 LIMIT 1`,
        [input.id, userId]
      );
      if (!existing.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found or access denied" });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIdx = 1;

      if (input.title !== undefined) {
        updates.push(`title = $${paramIdx++}`);
        values.push(input.title);
      }
      if (input.emoji !== undefined) {
        updates.push(`emoji = $${paramIdx++}`);
        values.push(input.emoji);
      }
      if (input.isPublic !== undefined) {
        updates.push(`is_public = $${paramIdx++}`);
        values.push(input.isPublic);
      }
      if (input.isEncrypted !== undefined) {
        updates.push(`is_encrypted = $${paramIdx++}`);
        values.push(input.isEncrypted);
      }
      if (input.isPinned !== undefined) {
        updates.push(`is_pinned = $${paramIdx++}`);
        values.push(input.isPinned);
      }
      if (input.position !== undefined) {
        updates.push(`position = $${paramIdx++}`);
        values.push(input.position);
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) {
        // Only updated_at, nothing else changed
        return formatSession(existing[0]);
      }

      values.push(input.id);
      const result = await query<SessionRow>(
        `UPDATE sessions SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        values
      );

      return formatSession(result[0]);
    }),

  // ── Delete session (soft delete → trash) ────────────────
  deleteSession: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.dbUserId;

      const result = await query(
        `UPDATE sessions SET is_deleted = TRUE, updated_at = NOW()
         WHERE id = $1 AND owner_id = $2`,
        [input.id, userId]
      );

      return { success: true };
    }),

  // ── Recover session from trash ──────────────────────────
  recoverSession: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.dbUserId;

      await query(
        `UPDATE sessions SET is_deleted = FALSE, updated_at = NOW()
         WHERE id = $1 AND owner_id = $2`,
        [input.id, userId]
      );

      return { success: true };
    }),

  // ── Permanently delete session ──────────────────────────
  deleteSessionPermanent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.dbUserId;

      // Cascade will delete blocks, tags, links, presence
      await query(
        `DELETE FROM sessions WHERE id = $1 AND owner_id = $2`,
        [input.id, userId]
      );

      return { success: true };
    }),

  // ── Duplicate session ───────────────────────────────────
  duplicateSession: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.dbUserId;

      return await withTransaction(async (client) => {
        // Get original session
        const origSessions = await client.query<SessionRow>(
          `SELECT * FROM sessions WHERE id = $1 AND owner_id = $2`,
          [input.id, userId]
        );
        if (!origSessions.rows.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }
        const orig = origSessions.rows[0];

        // Get max position
        const posResult = await client.query<{ max_pos: number }>(
          `SELECT COALESCE(MAX(position), -1) as max_pos FROM sessions WHERE owner_id = $1`,
          [userId]
        );
        const newPos = posResult.rows[0].max_pos + 1;

        // Create copy
        const newSessions = await client.query<SessionRow>(
          `INSERT INTO sessions (title, emoji, owner_id, is_public, is_encrypted, parent_id, position)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [`${orig.title} (Copy)`, orig.emoji, userId, orig.is_public, orig.is_encrypted, orig.parent_id, newPos]
        );
        const newSession = newSessions.rows[0];

        // Copy blocks
        const origBlocks = await client.query<BlockRow>(
          `SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY position`,
          [input.id]
        );
        for (const block of origBlocks.rows) {
          await client.query(
            `INSERT INTO session_blocks (session_id, type, content, position, is_encrypted, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newSession.id, block.type, JSON.stringify(block.content), block.position, block.is_encrypted, userId]
          );
        }

        // Copy tags
        await client.query(
          `INSERT INTO session_tags (session_id, tag_id)
           SELECT $1, tag_id FROM session_tags WHERE session_id = $2`,
          [newSession.id, input.id]
        );

        return formatSession(newSession);
      });
    }),

  // ── Reorder sessions (drag-to-reorder) ──────────────────
  reorderSessions: protectedProcedure
    .input(reorderSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.dbUserId;

      await withTransaction(async (client) => {
        for (const item of input.items) {
          await client.query(
            `UPDATE sessions SET position = $1 WHERE id = $2 AND owner_id = $3`,
            [item.position, item.id, userId]
          );
        }
      });

      return { success: true };
    }),

  // ── Update session tags ─────────────────────────────────
  updateSessionTags: protectedProcedure
    .input(updateSessionTagsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.dbUserId;

      // Verify ownership
      const existing = await query<SessionRow>(
        `SELECT id FROM sessions WHERE id = $1 AND owner_id = $2 LIMIT 1`,
        [input.sessionId, userId]
      );
      if (!existing.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      return await withTransaction(async (client) => {
        // Remove existing tags
        await client.query(`DELETE FROM session_tags WHERE session_id = $1`, [input.sessionId]);

        const resolvedTags: { id: number; label: string; color: string }[] = [];

        for (const tag of input.tags) {
          // Upsert tag
          const result = await client.query<TagRow>(
            `INSERT INTO vault_tags (user_id, label, color)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, label) WHERE user_id IS NOT NULL
             DO UPDATE SET color = EXCLUDED.color
             RETURNING id, label, color`,
            [userId, tag.label, tag.color]
          );
          const tagRow = result.rows[0];
          resolvedTags.push(tagRow);

          // Link to session
          await client.query(
            `INSERT INTO session_tags (session_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [input.sessionId, tagRow.id]
          );
        }

        return resolvedTags.map(t => ({ id: String(t.id), label: t.label, color: t.color }));
      });
    }),

  // ── Get trashed sessions ────────────────────────────────
  getTrashedSessions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.dbUserId;

    const sessions = await query<SessionRow>(
      `SELECT * FROM sessions WHERE owner_id = $1 AND is_deleted = TRUE ORDER BY updated_at DESC`,
      [userId]
    );

    return sessions.map(s => formatSession(s));
  }),

  // ══════════════════════════════════════════════════════════
  //  BLOCKS
  // ══════════════════════════════════════════════════════════

  // ── Get blocks for a session ────────────────────────────
  getBlocks: baseProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      // Verify session access
      const sessions = await query<SessionRow>(
        `SELECT * FROM sessions WHERE id = $1 LIMIT 1`,
        [input.sessionId]
      );
      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      const session = sessions[0];
      if (!session.is_public && session.owner_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const blocks = await query<BlockRow>(
        `SELECT * FROM session_blocks WHERE session_id = $1 ORDER BY position ASC`,
        [input.sessionId]
      );

      return blocks.map(formatBlock);
    }),

  // ── Create a new block ──────────────────────────────────
  createBlock: baseProcedure
    .input(createBlockSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      // Verify session exists and user has access
      const sessions = await query<SessionRow>(
        `SELECT * FROM sessions WHERE id = $1 LIMIT 1`,
        [input.sessionId]
      );
      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      const session = sessions[0];
      if (!session.is_public && session.owner_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Determine position
      let position = input.position;
      if (position === undefined) {
        const maxResult = await query<{ max_pos: number }>(
          `SELECT COALESCE(MAX(position), -1) as max_pos FROM session_blocks WHERE session_id = $1`,
          [input.sessionId]
        );
        position = maxResult[0].max_pos + 1;
      } else {
        // Shift existing blocks down to make room
        await query(
          `UPDATE session_blocks SET position = position + 1
           WHERE session_id = $1 AND position >= $2`,
          [input.sessionId, position]
        );
      }

      // Handle password block encryption
      let content = input.content;
      let isEncrypted = false;
      if (input.type === 'password') {
        isEncrypted = true;
        const password = (content as Record<string, string>).encryptedPassword || '';
        const username = (content as Record<string, string>).username || '';
        if (password) {
          const encrypted = encryptItemFieldsServer({ password, username });
          content = {
            ...content,
            encryptedPassword: encrypted.encryptedPassword,
            encryptedUsername: encrypted.encryptedUsername,
            encryptionIv: encrypted.encryptionIv,
            username: undefined, // remove plaintext
          };
        }
      }

      const blocks = await query<BlockRow>(
        `INSERT INTO session_blocks (session_id, type, content, position, is_encrypted, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [input.sessionId, input.type, JSON.stringify(content), position, isEncrypted, userId]
      );

      // Update session timestamp
      await query(`UPDATE sessions SET updated_at = NOW() WHERE id = $1`, [input.sessionId]);

      return formatBlock(blocks[0]);
    }),

  // ── Update a block ──────────────────────────────────────
  updateBlock: baseProcedure
    .input(updateBlockSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      // Get existing block and verify session access
      const existingBlocks = await query<BlockRow>(
        `SELECT b.*, s.owner_id, s.is_public
         FROM session_blocks b
         JOIN sessions s ON s.id = b.session_id
         WHERE b.id = $1 LIMIT 1`,
        [input.id]
      );
      if (!existingBlocks.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found" });
      }

      const block = existingBlocks[0];
      const sessionOwnerId = (block as unknown as { owner_id: number | null }).owner_id;
      const isPublic = (block as unknown as { is_public: boolean }).is_public;

      if (!isPublic && sessionOwnerId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIdx = 1;

      if (input.content !== undefined) {
        // Handle password encryption
        let content = input.content;
        if ((input.type || block.type) === 'password') {
          const password = (content as Record<string, string>).encryptedPassword || '';
          const username = (content as Record<string, string>).username || '';
          if (password) {
            const encrypted = encryptItemFieldsServer({ password, username });
            content = {
              ...content,
              encryptedPassword: encrypted.encryptedPassword,
              encryptedUsername: encrypted.encryptedUsername,
              encryptionIv: encrypted.encryptionIv,
              username: undefined,
            };
          }
        }
        updates.push(`content = $${paramIdx++}`);
        values.push(JSON.stringify(content));
      }
      if (input.type !== undefined) {
        updates.push(`type = $${paramIdx++}`);
        values.push(input.type);
      }

      updates.push(`updated_at = NOW()`);

      values.push(input.id);
      const result = await query<BlockRow>(
        `UPDATE session_blocks SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        values
      );

      // Update session timestamp
      await query(`UPDATE sessions SET updated_at = NOW() WHERE id = $1`, [block.session_id]);

      return formatBlock(result[0]);
    }),

  // ── Delete a block ──────────────────────────────────────
  deleteBlock: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      // Get block and verify access
      const blocks = await query<BlockRow & { owner_id: number | null; is_public: boolean }>(
        `SELECT b.*, s.owner_id, s.is_public
         FROM session_blocks b
         JOIN sessions s ON s.id = b.session_id
         WHERE b.id = $1 LIMIT 1`,
        [input.id]
      );
      if (!blocks.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Block not found" });
      }

      const block = blocks[0];
      if (!block.is_public && block.owner_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await query(`DELETE FROM session_blocks WHERE id = $1`, [input.id]);

      // Re-number remaining blocks
      await query(
        `WITH ranked AS (
           SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_pos
           FROM session_blocks WHERE session_id = $1
         )
         UPDATE session_blocks SET position = ranked.new_pos
         FROM ranked WHERE session_blocks.id = ranked.id`,
        [block.session_id]
      );

      // Update session timestamp
      await query(`UPDATE sessions SET updated_at = NOW() WHERE id = $1`, [block.session_id]);

      return { success: true };
    }),

  // ── Reorder blocks (drag-to-reorder) ────────────────────
  reorderBlocks: baseProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      items: z.array(z.object({ id: z.string().uuid(), position: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      await withTransaction(async (client) => {
        for (const item of input.items) {
          await client.query(
            `UPDATE session_blocks SET position = $1 WHERE id = $2 AND session_id = $3`,
            [item.position, item.id, input.sessionId]
          );
        }
      });

      return { success: true };
    }),

  // ── Batch update blocks (debounced save from editor) ────
  batchUpdateBlocks: baseProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      blocks: z.array(z.object({
        id: z.string().uuid(),
        content: blockContentSchema,
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      // Verify session access
      const sessions = await query<SessionRow>(
        `SELECT owner_id, is_public FROM sessions WHERE id = $1 LIMIT 1`,
        [input.sessionId]
      );
      if (!sessions.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      if (!sessions[0].is_public && sessions[0].owner_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await withTransaction(async (client) => {
        for (const block of input.blocks) {
          await client.query(
            `UPDATE session_blocks SET content = $1, updated_at = NOW() WHERE id = $2 AND session_id = $3`,
            [JSON.stringify(block.content), block.id, input.sessionId]
          );
        }
        await client.query(
          `UPDATE sessions SET updated_at = NOW() WHERE id = $1`,
          [input.sessionId]
        );
      });

      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════
  //  SESSION LINKS
  // ══════════════════════════════════════════════════════════

  // ── Create a session link ───────────────────────────────
  createSessionLink: baseProcedure
    .input(z.object({
      sourceSessionId: z.string().uuid(),
      targetSessionId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await query(
        `INSERT INTO session_links (source_session_id, target_session_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [input.sourceSessionId, input.targetSessionId]
      );
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════
  //  DASHBOARD DATA
  // ══════════════════════════════════════════════════════════

  getDashboardData: baseProcedure.query(async ({ ctx }) => {
    const userId = await optionalUserId(ctx.clerkUserId);

    // Recently visited (owner only)
    let recentlyVisited: SessionRow[] = [];
    if (userId) {
      recentlyVisited = await query<SessionRow>(
        `SELECT * FROM sessions
         WHERE owner_id = $1 AND is_deleted = FALSE AND last_visited_at IS NOT NULL
         ORDER BY last_visited_at DESC
         LIMIT 6`,
        [userId]
      );
    }

    // Trending (most viewed/copied, public sessions)
    const trending = await query<SessionRow>(
      `SELECT * FROM sessions
       WHERE is_public = TRUE AND is_deleted = FALSE
       ORDER BY (view_count + copy_count * 2) DESC
       LIMIT 6`
    );

    // Pinned (owner only)
    let pinned: SessionRow[] = [];
    if (userId) {
      pinned = await query<SessionRow>(
        `SELECT * FROM sessions
         WHERE owner_id = $1 AND is_deleted = FALSE AND is_pinned = TRUE
         ORDER BY position ASC
         LIMIT 6`,
        [userId]
      );
    }

    // Get first block preview for each session
    const allSessionIds = [...new Set([
      ...recentlyVisited.map(s => s.id),
      ...trending.map(s => s.id),
      ...pinned.map(s => s.id),
    ])];

    let previews = new Map<string, string>();
    if (allSessionIds.length > 0) {
      const previewRows = await query<{ session_id: string; preview: string }>(
        `SELECT DISTINCT ON (session_id) session_id,
                LEFT(content->>'plainText', 100) AS preview
         FROM session_blocks
         WHERE session_id = ANY($1) AND type = 'text'
         ORDER BY session_id, position ASC`,
        [allSessionIds]
      );
      for (const row of previewRows) {
        previews.set(row.session_id, row.preview || '');
      }
    }

    const formatForDashboard = (s: SessionRow) => ({
      ...formatSession(s),
      preview: previews.get(s.id) || '',
    });

    return {
      recentlyVisited: recentlyVisited.map(formatForDashboard),
      trending: trending.map(formatForDashboard),
      pinned: pinned.map(formatForDashboard),
    };
  }),

  // ── Increment copy count ────────────────────────────────
  incrementCopyCount: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query(
        `UPDATE sessions SET copy_count = copy_count + 1 WHERE id = $1`,
        [input.id]
      );
      return { success: true };
    }),

  // ── Update session canvas position (single) ─────────────
  updateSessionPosition: baseProcedure
    .input(z.object({
      id: z.string().uuid(),
      canvasX: z.number(),
      canvasY: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      await query(
        `UPDATE sessions SET canvas_x = $1, canvas_y = $2 WHERE id = $3 AND (owner_id = $4 OR (owner_id IS NULL AND is_public = TRUE))`,
        [input.canvasX, input.canvasY, input.id, userId]
      );

      return { success: true };
    }),

  // ── Batch update session canvas positions ────────────────
  updateSessionPositions: baseProcedure
    .input(z.object({
      positions: z.array(z.object({
        id: z.string().uuid(),
        canvasX: z.number(),
        canvasY: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);

      await withTransaction(async (client) => {
        for (const pos of input.positions) {
          await client.query(
            `UPDATE sessions SET canvas_x = $1, canvas_y = $2 WHERE id = $3 AND (owner_id = $4 OR (owner_id IS NULL AND is_public = TRUE))`,
            [pos.canvasX, pos.canvasY, pos.id, userId]
          );
        }
      });

      return { success: true };
    }),

  // ── Search sessions ─────────────────────────────────────
  searchSessions: baseProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const userId = await optionalUserId(ctx.clerkUserId);
      const searchTerm = `%${input.query}%`;

      let sessions: SessionRow[];
      if (userId) {
        sessions = await query<SessionRow>(
          `SELECT DISTINCT s.* FROM sessions s
           LEFT JOIN session_blocks b ON b.session_id = s.id
           WHERE s.is_deleted = FALSE
             AND (s.owner_id = $1 OR s.is_public = TRUE)
             AND (s.title ILIKE $2 OR b.content->>'plainText' ILIKE $2 OR b.content->>'html' ILIKE $2)
           ORDER BY s.updated_at DESC
           LIMIT 20`,
          [userId, searchTerm]
        );
      } else {
        sessions = await query<SessionRow>(
          `SELECT DISTINCT s.* FROM sessions s
           LEFT JOIN session_blocks b ON b.session_id = s.id
           WHERE s.is_deleted = FALSE AND s.is_public = TRUE
             AND (s.title ILIKE $1 OR b.content->>'plainText' ILIKE $1 OR b.content->>'html' ILIKE $1)
           ORDER BY s.updated_at DESC
           LIMIT 20`,
          [searchTerm]
        );
      }

      return sessions.map(s => formatSession(s));
    }),
});
