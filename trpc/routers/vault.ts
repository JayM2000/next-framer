import { query, withTransaction } from "@/db";
import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// ── Zod Schemas ──────────────────────────────────────────────

const tagSchema = z.object({
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8b5cf6"),
});

const createItemSchema = z.object({
  type: z.enum(["password", "note", "clipboard"]),
  visibility: z.enum(["public", "private"]).default("private"),
  title: z.string().min(1).max(500),
  content: z.string().default(""),
  plainText: z.string().default(""),
  siteUrl: z.string().max(2048).optional(),
  username: z.string().max(500).optional(),
  password: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(tagSchema).optional(),
});

const updateItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["password", "note", "clipboard"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  plainText: z.string().optional(),
  siteUrl: z.string().max(2048).nullable().optional(),
  username: z.string().max(500).nullable().optional(),
  password: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(tagSchema).optional(),
});

// ── Row types ──────────────────────────────────────────────

interface VaultItemRow {
  id: string;
  user_id: number | null;
  type: string;
  visibility: string;
  title: string;
  content: string;
  plain_text: string;
  site_url: string | null;
  site_username: string | null;
  encrypted_password: string | null;
  images_json: string[] | null;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

interface TagRow {
  id: number;
  label: string;
  color: string;
}

interface ItemTagRow {
  item_id: string;
  tag_id: number;
  label: string;
  color: string;
}

// ── Helper: format DB row → client shape ──────────────────

function formatItem(
  row: VaultItemRow,
  tags: { id: number; label: string; color: string }[]
) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    type: row.type as "password" | "note" | "clipboard",
    visibility: row.visibility as "public" | "private",
    title: row.title,
    content: row.content,
    plainText: row.plain_text,
    siteUrl: row.site_url ?? undefined,
    username: row.site_username ?? undefined,
    password: row.encrypted_password ?? undefined,
    images: row.images_json ?? undefined,
    tags: tags.map((t) => ({
      id: String(t.id),
      label: t.label,
      color: t.color,
    })),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ── Helper: resolve user ID from clerk ────────────────────

async function resolveUserId(clerkUserId: string): Promise<number> {
  const rows = await query<{ id: number }>(
    `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
    [clerkUserId]
  );
  if (!rows.length) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found in database",
    });
  }
  return rows[0].id;
}

// ── Helper: optionally resolve user ID (returns null if not logged in) ──

async function optionalUserId(
  clerkUserId: string | null | undefined
): Promise<number | null> {
  if (!clerkUserId) return null;
  const rows = await query<{ id: number }>(
    `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
    [clerkUserId]
  );
  return rows.length ? rows[0].id : null;
}

// ── Helper: upsert tags and link to item ──────────────────
// userId can be null for anonymous items

async function upsertTagsForItem(
  userId: number | null,
  itemId: string,
  tags: { label: string; color: string }[],
  client: import("pg").PoolClient
): Promise<{ id: number; label: string; color: string }[]> {
  // Remove existing tag links for this item
  await client.query(`DELETE FROM vault_item_tags WHERE item_id = $1`, [itemId]);

  if (!tags.length) return [];

  const resolvedTags: { id: number; label: string; color: string }[] = [];

  for (const tag of tags) {
    let tagRow: TagRow;

    if (userId !== null) {
      // Logged-in user: upsert with user_id
      const result = await client.query<TagRow>(
        `INSERT INTO vault_tags (user_id, label, color)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, label) WHERE user_id IS NOT NULL
         DO UPDATE SET color = EXCLUDED.color
         RETURNING id, label, color`,
        [userId, tag.label, tag.color]
      );
      tagRow = result.rows[0];
    } else {
      // Anonymous: upsert with NULL user_id
      // Try to find existing anonymous tag first
      const existing = await client.query<TagRow>(
        `SELECT id, label, color FROM vault_tags
         WHERE user_id IS NULL AND label = $1`,
        [tag.label]
      );

      if (existing.rows.length > 0) {
        // Update the color
        await client.query(
          `UPDATE vault_tags SET color = $1 WHERE id = $2`,
          [tag.color, existing.rows[0].id]
        );
        tagRow = { ...existing.rows[0], color: tag.color };
      } else {
        // Insert new anonymous tag
        const result = await client.query<TagRow>(
          `INSERT INTO vault_tags (user_id, label, color)
           VALUES (NULL, $1, $2)
           RETURNING id, label, color`,
          [tag.label, tag.color]
        );
        tagRow = result.rows[0];
      }
    }

    resolvedTags.push(tagRow);

    // Link tag to item
    await client.query(
      `INSERT INTO vault_item_tags (item_id, tag_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [itemId, tagRow.id]
    );
  }

  return resolvedTags;
}

// ══════════════════════════════════════════════════════════
//  VAULT ROUTER
// ══════════════════════════════════════════════════════════

export const vaultRouter = createTRPCRouter({
  // ── Get all items for the logged-in user ────────────────
  getItems: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.clerkUserId!);

    const items = await query<VaultItemRow>(
      `SELECT * FROM vault_items
       WHERE user_id = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC`,
      [userId]
    );

    // Fetch all tags for these items in one query
    const itemIds = items.map((i) => i.id);
    let allItemTags: ItemTagRow[] = [];

    if (itemIds.length > 0) {
      allItemTags = await query<ItemTagRow>(
        `SELECT vit.item_id, vt.id AS tag_id, vt.label, vt.color
         FROM vault_item_tags vit
         JOIN vault_tags vt ON vt.id = vit.tag_id
         WHERE vit.item_id = ANY($1)`,
        [itemIds]
      );
    }

    // Group tags by item ID
    const tagsByItem = new Map<string, { id: number; label: string; color: string }[]>();
    for (const row of allItemTags) {
      const arr = tagsByItem.get(row.item_id) ?? [];
      arr.push({ id: row.tag_id, label: row.label, color: row.color });
      tagsByItem.set(row.item_id, arr);
    }

    return items.map((item) => formatItem(item, tagsByItem.get(item.id) ?? []));
  }),

  // ── Get public items (no auth required) ─────────────────
  getPublicItems: baseProcedure.query(async () => {
    const items = await query<VaultItemRow>(
      `SELECT * FROM vault_items
       WHERE visibility = 'public' AND is_deleted = FALSE
       ORDER BY created_at DESC`
    );

    const itemIds = items.map((i) => i.id);
    let allItemTags: ItemTagRow[] = [];

    if (itemIds.length > 0) {
      allItemTags = await query<ItemTagRow>(
        `SELECT vit.item_id, vt.id AS tag_id, vt.label, vt.color
         FROM vault_item_tags vit
         JOIN vault_tags vt ON vt.id = vit.tag_id
         WHERE vit.item_id = ANY($1)`,
        [itemIds]
      );
    }

    const tagsByItem = new Map<string, { id: number; label: string; color: string }[]>();
    for (const row of allItemTags) {
      const arr = tagsByItem.get(row.item_id) ?? [];
      arr.push({ id: row.tag_id, label: row.label, color: row.color });
      tagsByItem.set(row.item_id, arr);
    }

    // Strip sensitive fields from public items
    return items.map((item) => {
      const formatted = formatItem(item, tagsByItem.get(item.id) ?? []);
      // Never leak passwords on public route
      if (formatted.type === "password") {
        formatted.password = undefined;
      }
      return formatted;
    });
  }),

  // ── Create a new item (PUBLIC — works with or without login) ──
  createItem: baseProcedure
    .input(createItemSchema)
    .mutation(async ({ ctx, input }) => {
      // Optionally resolve the user — null if not logged in
      const userId = await optionalUserId(ctx.clerkUserId);
      console.log(userId, 'llmmm✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️✔️');

      // Anonymous users can only create public items
      const visibility = userId ? input.visibility : "public";

      const result = await withTransaction(async (client) => {
        // Insert the item (user_id may be NULL for anonymous)
        const insertResult = await client.query<VaultItemRow>(
          `INSERT INTO vault_items
             (user_id, type, visibility, title, content, plain_text,
              site_url, site_username, encrypted_password, images_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            userId,
            input.type,
            visibility,
            input.title,
            input.content,
            input.plainText,
            input.siteUrl ?? null,
            input.username ?? null,
            input.password ?? null,
            JSON.stringify(input.images ?? []),
          ]
        );

        const item = insertResult.rows[0];

        // Upsert tags (handles null userId for anonymous)
        const tags = await upsertTagsForItem(
          userId,
          item.id,
          input.tags ?? [],
          client
        );

        return formatItem(item, tags);
      });

      return result;
    }),

  // ── Update an existing item (PRIVATE — login required) ──
  updateItem: protectedProcedure
    .input(updateItemSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      // Verify ownership
      const existing = await query<VaultItemRow>(
        `SELECT * FROM vault_items WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
        [input.id, userId]
      );

      if (!existing.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      const result = await withTransaction(async (client) => {
        // Build dynamic SET clause
        const sets: string[] = [];
        const params: unknown[] = [];
        let paramIdx = 1;

        const addField = (col: string, val: unknown) => {
          if (val !== undefined) {
            sets.push(`${col} = $${paramIdx++}`);
            params.push(val);
          }
        };

        addField("type", input.type);
        addField("visibility", input.visibility);
        addField("title", input.title);
        addField("content", input.content);
        addField("plain_text", input.plainText);
        addField("site_url", input.siteUrl);
        addField("site_username", input.username);
        addField("encrypted_password", input.password);
        if (input.images !== undefined) {
          addField("images_json", JSON.stringify(input.images));
        }

        // Always bump updated_at
        sets.push(`updated_at = CURRENT_TIMESTAMP`);

        if (sets.length === 1) {
          // Only updated_at — no real changes, just return current
          const current = existing[0];
          const tagRows = await query<ItemTagRow>(
            `SELECT vit.item_id, vt.id AS tag_id, vt.label, vt.color
             FROM vault_item_tags vit
             JOIN vault_tags vt ON vt.id = vit.tag_id
             WHERE vit.item_id = $1`,
            [input.id]
          );
          return formatItem(
            current,
            tagRows.map((r) => ({ id: r.tag_id, label: r.label, color: r.color }))
          );
        }

        params.push(input.id);
        params.push(userId);

        const updateResult = await client.query<VaultItemRow>(
          `UPDATE vault_items SET ${sets.join(", ")}
           WHERE id = $${paramIdx++} AND user_id = $${paramIdx}
           RETURNING *`,
          params
        );

        const item = updateResult.rows[0];

        // Update tags if provided
        let tags: { id: number; label: string; color: string }[];
        if (input.tags !== undefined) {
          tags = await upsertTagsForItem(userId, item.id, input.tags, client);
        } else {
          // Fetch existing tags
          const tagResult = await client.query<TagRow>(
            `SELECT vt.id, vt.label, vt.color
             FROM vault_item_tags vit
             JOIN vault_tags vt ON vt.id = vit.tag_id
             WHERE vit.item_id = $1`,
            [item.id]
          );
          tags = tagResult.rows;
        }

        return formatItem(item, tags);
      });

      return result;
    }),

  // ── Soft-delete an item (PRIVATE — login required) ──────
  deleteItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      const result = await query(
        `UPDATE vault_items
         SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
         RETURNING id`,
        [input.id, userId]
      );

      if (!result.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      return { success: true, id: input.id };
    }),

  // ── Toggle visibility (PRIVATE — login required) ────────
  toggleVisibility: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      const result = await query<VaultItemRow>(
        `UPDATE vault_items
         SET visibility = CASE WHEN visibility = 'public' THEN 'private' ELSE 'public' END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
         RETURNING *`,
        [input.id, userId]
      );

      if (!result.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found",
        });
      }

      // Fetch tags
      const tagRows = await query<ItemTagRow>(
        `SELECT vit.item_id, vt.id AS tag_id, vt.label, vt.color
         FROM vault_item_tags vit
         JOIN vault_tags vt ON vt.id = vit.tag_id
         WHERE vit.item_id = $1`,
        [input.id]
      );

      return formatItem(
        result[0],
        tagRows.map((r) => ({ id: r.tag_id, label: r.label, color: r.color }))
      );
    }),
});

