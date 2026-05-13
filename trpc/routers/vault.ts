import { query, withTransaction } from "@/db";
import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { encryptItemFieldsServer, decryptItemFieldsServer } from "@/lib/vault/server-crypto";

// ── Rate Limiting (In-Memory) ────────────────────────────────
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_ANON_ITEMS_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ── Lazy Expired Item Cleanup (throttled) ────────────────────
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 60 * 1000; // run at most once per 60 seconds

async function cleanupExpiredItems() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  try {
    // Delete tags first (foreign key), then the items
    await query(
      `DELETE FROM vault_item_tags
       WHERE item_id IN (
         SELECT id FROM vault_items
         WHERE expires_at IS NOT NULL AND expires_at <= NOW()
       )`
    );
    const deleted = await query<{ id: string }>(
      `DELETE FROM vault_items
       WHERE expires_at IS NOT NULL AND expires_at <= NOW()
       RETURNING id`
    );
    if (deleted.length > 0) {
      console.log(`[vault-cleanup] Purged ${deleted.length} expired item(s)`);
    }
  } catch (e) {
    console.error('[vault-cleanup] Failed to purge expired items:', e);
  }
}

// ── Zod Schemas ──────────────────────────────────────────────

const tagSchema = z.object({
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#8b5cf6"),
});

const createItemSchema = z.object({
  type: z.enum(["password", "note", "clipboard"]),
  visibility: z.enum(["public", "private"]).default("private"),
  title: z.string().max(500).default(""),
  content: z.string().default(""),
  plainText: z.string().default(""),
  siteUrl: z.string().max(2048).optional(),
  username: z.string().max(500).optional(),
  password: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(tagSchema).optional(),
  isImportant: z.boolean().default(false),
  autoTagEnabled: z.boolean().optional(), // client passes localStorage value for anonymous
  expiresAt: z.string().optional(), // ISO date string for item expiry (anonymous users)
  isContentEncrypted: z.boolean().default(false), // opt-in content encryption for public items
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
  isImportant: z.boolean().optional(),
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
  is_important: boolean;
  is_encrypted: boolean;
  is_content_encrypted: boolean;
  encrypted_content: string | null;
  encrypted_plain_text: string | null;
  encrypted_username: string | null;
  encryption_iv: string | null;
  copy_count: number;
  is_deleted: boolean;
  expires_at: Date | null;
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

interface UserSettingsRow {
  user_id: number;
  show_profile_on_public: boolean;
  auto_tag_enabled: boolean;
}

// Extended row returned by the public items query (joins user + settings)
interface PublicItemRow extends VaultItemRow {
  owner_name: string | null;
  owner_show_profile: boolean | null;
}

interface ActivityRow {
  week_start: string;
  count: string; // bigint comes back as string
}

// ── Helper: extract clickable URLs from content ───────────

const URL_REGEX = /https?:\/\/[^\s<>"'`,;)\]]+|www\.[^\s<>"'`,;)\]]+/gi;

function extractUrls(plainText: string): { url: string; label: string }[] {
  if (!plainText || plainText.trim().length < 5) return [];

  const matches = plainText.match(URL_REGEX);
  if (!matches) return [];

  const seen = new Set<string>();
  const results: { url: string; label: string }[] = [];

  for (const raw of matches) {
    // Normalise: add protocol if missing
    const url = raw.startsWith('www.') ? `https://${raw}` : raw;

    // Strip trailing punctuation that may have been captured
    const cleaned = url.replace(/[.,;:!?)\]]+$/, '');

    if (seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());

    // Build friendly label from URL
    try {
      const parsed = new URL(cleaned);
      const host = parsed.hostname.replace(/^www\./, '');
      // Take first meaningful path segment (skip empty)
      const segments = parsed.pathname.split('/').filter(Boolean);
      const firstSeg = segments[0];
      const label = firstSeg && firstSeg.length <= 24
        ? `${host}/${firstSeg}`
        : host;
      results.push({ url: cleaned, label });
    } catch {
      // Fallback: just show truncated URL
      const label = cleaned.replace(/^https?:\/\//, '').slice(0, 30);
      results.push({ url: cleaned, label });
    }

    if (results.length >= 5) break;
  }

  return results;
}

// ── Helper: format DB row → client shape ──────────────────

function formatItem(
  row: VaultItemRow,
  tags: { id: number; label: string; color: string }[],
  /** When true, don't decrypt content-encrypted items (used for list/display endpoints) */
  maskContentEncrypted = false
) {
  let finalPassword = row.encrypted_password ?? undefined;
  let finalUsername = row.site_username ?? undefined;
  let finalContent = row.content;
  let finalPlainText = row.plain_text;

  // If this item has opt-in content encryption AND we're in masking mode,
  // return empty content with the flag set — don't decrypt for display.
  if (row.is_content_encrypted && maskContentEncrypted && row.encryption_iv) {
    return {
      id: row.id,
      userId: row.user_id ?? null,
      type: row.type as "password" | "note" | "clipboard",
      visibility: row.visibility as "public" | "private",
      title: row.title,
      content: '',
      plainText: '',
      siteUrl: row.site_url ?? undefined,
      username: finalUsername,
      password: finalPassword,
      images: row.images_json ?? undefined,
      tags: tags.map((t) => ({
        id: String(t.id),
        label: t.label,
        color: t.color,
      })),
      extractedUrls: [],
      isImportant: row.is_important,
      isContentEncrypted: true,
      copyCount: row.copy_count ?? 0,
      isDeleted: row.is_deleted,
      expiresAt: row.expires_at ? row.expires_at.toISOString() : undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  // Server-side Decryption
  if (row.is_encrypted && row.encryption_iv) {
    try {
      const decrypted = decryptItemFieldsServer({
        encryptedPassword: row.encrypted_password,
        encryptedUsername: row.encrypted_username,
        encryptedContent: row.encrypted_content,
        encryptedPlainText: row.encrypted_plain_text,
        encryptionIv: row.encryption_iv,
      });
      if (decrypted.password) finalPassword = decrypted.password;
      if (decrypted.username) finalUsername = decrypted.username;
      if (decrypted.content) finalContent = decrypted.content;
      if (decrypted.plainText) finalPlainText = decrypted.plainText;
    } catch (e) {
      console.error('Failed to decrypt item:', row.id, e);
    }
  }

  // Also decrypt content-encrypted items (when NOT masking — e.g. owner's getItems)
  if (row.is_content_encrypted && row.encryption_iv && !row.is_encrypted) {
    try {
      const decrypted = decryptItemFieldsServer({
        encryptedContent: row.encrypted_content,
        encryptedPlainText: row.encrypted_plain_text,
        encryptedPassword: null,
        encryptedUsername: null,
        encryptionIv: row.encryption_iv,
      });
      if (decrypted.content) finalContent = decrypted.content;
      if (decrypted.plainText) finalPlainText = decrypted.plainText;
    } catch (e) {
      console.error('Failed to decrypt content-encrypted item:', row.id, e);
    }
  }

  return {
    id: row.id,
    userId: row.user_id ?? null,
    type: row.type as "password" | "note" | "clipboard",
    visibility: row.visibility as "public" | "private",
    title: row.title,
    content: finalContent,
    plainText: finalPlainText,
    siteUrl: row.site_url ?? undefined,
    username: finalUsername,
    password: finalPassword,
    images: row.images_json ?? undefined,
    tags: tags.map((t) => ({
      id: String(t.id),
      label: t.label,
      color: t.color,
    })),
    extractedUrls: extractUrls(finalPlainText),
    isImportant: row.is_important,
    isContentEncrypted: row.is_content_encrypted,
    copyCount: row.copy_count ?? 0,
    isDeleted: row.is_deleted,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : undefined,
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

// ── Helper: extract auto-tags from content ────────────────

const STOPWORDS = new Set([
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','her','she',
  'or','an','will','my','one','all','would','there','their','what','so','up','out',
  'if','about','who','get','which','go','me','when','make','can','like','time','no',
  'just','him','know','take','people','into','year','your','good','some','could',
  'them','see','other','than','then','now','look','only','come','its','over','think',
  'also','back','after','use','two','how','our','work','first','well','way','even',
  'new','want','because','any','these','give','day','most','us','is','are','was',
  'were','been','has','had','did','does','may','might','shall','should','must',
  'am','being','having','doing','very','really','here','where','much','many',
  'such','each','every','both','few','more','most','own','same','still','too',
  'before','through','between','those','after','above','below','since',
  'while','during','without','within','along','against','upon','already','yet',
  'again','once','under','further','never','always','often','sometimes','usually',
  'however','therefore','thus','although','though','unless','except','rather',
  'quite','almost','enough','perhaps','probably','actually','basically',
  'simply','clearly','obviously','definitely','certainly','absolutely',
  'test','snippet','quick','item','note','info','adding','added','put',
]);

const AUTO_TAG_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#10b981'];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'code': ['function', 'const', 'let', 'var', 'return', 'import', 'export', 'class', 'interface', 'async', 'await', 'console', 'log', 'error', 'try', 'catch', 'throw', 'module', 'require', 'npm', 'yarn', 'node', 'react', 'next', 'typescript', 'javascript', 'python', 'java', 'html', 'css', 'api', 'endpoint', 'http', 'request', 'response', 'json', 'xml', 'sql', 'query', 'database', 'schema', 'migration'],
  'link': ['http://', 'https://', 'www.', '.com', '.org', '.net', '.io', 'url', 'website'],
  'password': ['password', 'login', 'credential', 'secret', 'token', 'auth', 'apikey'],
  'recipe': ['ingredient', 'cook', 'bake', 'recipe', 'tablespoon', 'teaspoon', 'cup', 'oven', 'preheat'],
  'tutorial': ['step', 'tutorial', 'guide', 'howto', 'instruction', 'learn', 'example', 'walkthrough'],
  'config': ['config', 'configuration', 'setting', 'environment', 'env', 'variable', 'port', 'host', 'server'],
  'personal': ['birthday', 'address', 'phone', 'email', 'contact', 'account', 'profile'],
  'finance': ['price', 'cost', 'payment', 'invoice', 'budget', 'expense', 'salary', 'tax', 'bank', 'credit', 'debit', 'money', 'dollar', 'amount'],
  'idea': ['idea', 'brainstorm', 'concept', 'thought', 'plan', 'proposal', 'suggestion', 'draft'],
};

function extractAutoTags(plainText: string): { label: string; color: string }[] {
  if (!plainText || plainText.trim().length < 5) return [];

  const text = plainText.toLowerCase();
  const tags: { label: string; score: number }[] = [];

  // 1. Check category keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchCount = keywords.filter(kw => text.includes(kw)).length;
    if (matchCount >= 2 || (category === 'link' && matchCount >= 1)) {
      tags.push({ label: category, score: matchCount * 10 });
    }
  }

  // 2. Extract top frequent meaningful words as additional tags
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency, take top words that appear 2+ times
  const topWords = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, count]) => ({ label: word, score: count }));

  tags.push(...topWords);

  // 3. Deduplicate and take top 3
  const seen = new Set<string>();
  const uniqueTags = tags
    .sort((a, b) => b.score - a.score)
    .filter(t => {
      if (seen.has(t.label)) return false;
      seen.add(t.label);
      return true;
    })
    .slice(0, 3);

  // If no tags found, derive from first significant word
  if (uniqueTags.length === 0 && words.length > 0) {
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      uniqueTags.push({ label: sorted[0][0], score: sorted[0][1] });
    }
  }

  return uniqueTags.map((t, i) => ({
    label: t.label,
    color: AUTO_TAG_COLORS[i % AUTO_TAG_COLORS.length],
  }));
}

// ── Helper: extract auto-title from content ───────────────

function extractAutoTitle(plainText: string): string {
  if (!plainText || plainText.trim().length < 3) return 'Quick Snippet';

  const text = plainText.trim();

  // 1. Use the first line as the primary candidate
  const firstLine = text.split(/[\n\r]+/)[0].trim();

  // If the first line is short enough and meaningful, use it directly
  if (firstLine.length >= 3 && firstLine.length <= 60) {
    return firstLine.charAt(0).toUpperCase() + firstLine.slice(1);
  }

  // 2. If first line is too long, extract meaningful words
  const words = firstLine
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()));

  if (words.length > 0) {
    // Take up to 5 words to form a title
    const titleWords = words.slice(0, 5);
    const title = titleWords
      .map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)
      .join(' ');
    return title.length > 60 ? title.substring(0, 57) + '...' : title;
  }

  // 3. If first line was too short or had no meaningful words, try category detection
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchCount = keywords.filter(kw => lowerText.includes(kw)).length;
    if (matchCount >= 2 || (category === 'link' && matchCount >= 1)) {
      return category.charAt(0).toUpperCase() + category.slice(1) + ' Snippet';
    }
  }

  return 'Quick Snippet';
}

// ══════════════════════════════════════════════════════════
//  VAULT ROUTER
// ══════════════════════════════════════════════════════════

export const vaultRouter = createTRPCRouter({
  // ── Get all items for the logged-in user ────────────────
  getItems: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.clerkUserId!);

    const items = await query<VaultItemRow>(
      `SELECT id, user_id, type, visibility, title, content, plain_text,
              site_url, site_username, encrypted_password, images_json,
              is_important, is_encrypted, is_content_encrypted, encrypted_content, encrypted_plain_text,
              encrypted_username, encryption_iv, copy_count, is_deleted,
              expires_at, created_at, updated_at
       FROM vault_items
       WHERE user_id = $1
         AND (expires_at IS NULL OR expires_at > NOW())
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
    // Join owner name + profile visibility setting
    const items = await query<PublicItemRow>(
      `SELECT vi.*,
              u.name       AS owner_name,
              COALESCE(us.show_profile_on_public, FALSE) AS owner_show_profile
       FROM vault_items vi
       LEFT JOIN users u         ON u.id = vi.user_id
       LEFT JOIN user_settings us ON us.user_id = vi.user_id
       WHERE vi.visibility = 'public' AND vi.is_deleted = FALSE
         AND (vi.expires_at IS NULL OR vi.expires_at > NOW())
       ORDER BY vi.copy_count DESC, vi.created_at DESC`
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

    // Strip sensitive fields from public items and attach owner info
    return items.map((item) => {
      const formatted = formatItem(item, tagsByItem.get(item.id) ?? [], true);
      // Never leak passwords on public route
      if (formatted.type === "password") {
        formatted.password = undefined;
      }
      return {
        ...formatted,
        ownerName: item.owner_name ?? undefined,
        ownerShowProfile: item.owner_show_profile ?? false,
      };
    });
  }),

  // ── Get public items with cursor-based pagination ───────
  getPublicItemsPaginated: baseProcedure
    .input(
      z.object({
        cursor: z.string().nullish(), // JSON-encoded cursor: { createdAt, id }
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      // Fire-and-forget: purge expired items from DB (throttled, non-blocking)
      cleanupExpiredItems().catch(() => {});

      const limit = input.limit;

      let items: PublicItemRow[];

      if (input.cursor) {
        // Decode composite cursor
        let cursorData: { createdAt: string; id: string };
        try {
          cursorData = JSON.parse(input.cursor);
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid cursor" });
        }

        items = await query<PublicItemRow>(
          `SELECT vi.id, vi.user_id, vi.type, vi.visibility, vi.title, vi.content,
                  vi.plain_text, vi.site_url, vi.site_username, vi.encrypted_password,
                  vi.images_json, vi.is_important, vi.is_encrypted, vi.is_content_encrypted, vi.encrypted_content,
                  vi.encrypted_plain_text, vi.encrypted_username, vi.encryption_iv,
                  vi.copy_count, vi.is_deleted, vi.expires_at, vi.created_at, vi.updated_at,
                  u.name       AS owner_name,
                  COALESCE(us.show_profile_on_public, FALSE) AS owner_show_profile
           FROM vault_items vi
           LEFT JOIN users u         ON u.id = vi.user_id
           LEFT JOIN user_settings us ON us.user_id = vi.user_id
           WHERE vi.visibility = 'public' AND vi.is_deleted = FALSE
             AND (vi.expires_at IS NULL OR vi.expires_at > NOW())
             AND (vi.created_at, vi.id) < ($1::timestamptz, $2::uuid)
           ORDER BY vi.created_at DESC, vi.id DESC
           LIMIT $3`,
          [cursorData.createdAt, cursorData.id, limit + 1]
        );
      } else {
        // First page — no cursor
        items = await query<PublicItemRow>(
          `SELECT vi.id, vi.user_id, vi.type, vi.visibility, vi.title, vi.content,
                  vi.plain_text, vi.site_url, vi.site_username, vi.encrypted_password,
                  vi.images_json, vi.is_important, vi.is_encrypted, vi.is_content_encrypted, vi.encrypted_content,
                  vi.encrypted_plain_text, vi.encrypted_username, vi.encryption_iv,
                  vi.copy_count, vi.is_deleted, vi.expires_at, vi.created_at, vi.updated_at,
                  u.name       AS owner_name,
                  COALESCE(us.show_profile_on_public, FALSE) AS owner_show_profile
           FROM vault_items vi
           LEFT JOIN users u         ON u.id = vi.user_id
           LEFT JOIN user_settings us ON us.user_id = vi.user_id
           WHERE vi.visibility = 'public' AND vi.is_deleted = FALSE
             AND (vi.expires_at IS NULL OR vi.expires_at > NOW())
           ORDER BY vi.created_at DESC, vi.id DESC
           LIMIT $1`,
          [limit + 1]
        );
      }

      // Determine if there's a next page
      let nextCursor: string | null = null;
      if (items.length > limit) {
        const lastItem = items[limit - 1]; // last item of this page
        nextCursor = JSON.stringify({
          createdAt: lastItem.created_at.toISOString(),
          id: lastItem.id,
        });
        items = items.slice(0, limit); // trim the extra item
      }

      // Fetch tags for this page's items
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

      const formattedItems = items.map((item) => {
        const formatted = formatItem(item, tagsByItem.get(item.id) ?? [], true);
        if (formatted.type === "password") {
          formatted.password = undefined;
        }
        return {
          ...formatted,
          ownerName: item.owner_name ?? undefined,
          ownerShowProfile: item.owner_show_profile ?? false,
        };
      });

      return {
        items: formattedItems,
        nextCursor,
      };
    }),

  // ── Create a new item (PUBLIC — works with or without login) ──
  createItem: baseProcedure
    .input(createItemSchema)
    .mutation(async ({ ctx, input }) => {
      // Optionally resolve the user — null if not logged in
      const userId = await optionalUserId(ctx.clerkUserId);

      // Passwords are always private; anonymous users can only create public items
      const visibility = input.type === "password"
        ? "private"
        : userId ? input.visibility : "public";

      // ── Rate Limiting for Anonymous Users ──
      if (!userId && ctx.clientIp && ctx.clientIp !== 'unknown') {
        const now = Date.now();
        
        // Basic cleanup to prevent memory leaks if abused heavily
        if (rateLimitMap.size > 5000) {
          for (const [ip, record] of rateLimitMap.entries()) {
            if (now >= record.expiresAt) rateLimitMap.delete(ip);
          }
        }

        const record = rateLimitMap.get(ctx.clientIp);
        if (record && now < record.expiresAt) {
          if (record.count >= MAX_ANON_ITEMS_PER_HOUR) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "Rate limit exceeded: You can only create 10 items per hour as a guest. Please sign in to create more.",
            });
          }
          record.count += 1;
        } else {
          // Reset or create new record
          rateLimitMap.set(ctx.clientIp, {
            count: 1,
            expiresAt: now + RATE_LIMIT_WINDOW_MS,
          });
        }
      }

      // Check auto-tag setting
      let autoTagEnabled = input.autoTagEnabled ?? true; // use client value, default true
      if (userId) {
        // Logged-in user: always read from DB (ignore client override)
        const settingsRows = await query<UserSettingsRow>(
          `SELECT * FROM user_settings WHERE user_id = $1`,
          [userId]
        );
        if (settingsRows.length > 0) {
          autoTagEnabled = settingsRows[0].auto_tag_enabled;
        }
      }

      // Determine final tags: user-provided, or auto-generated (respects autoTagEnabled)
      let finalTags = input.tags ?? [];
      if (finalTags.length === 0 && autoTagEnabled) {
        finalTags = extractAutoTags(input.plainText);
      }

      // Determine final title: auto-title is ALWAYS enabled regardless of autoTagEnabled
      const titleIsEmpty = !input.title.trim() || input.title.trim() === 'Quick Snippet';
      const finalTitle = titleIsEmpty
        ? extractAutoTitle(input.plainText)
        : (input.title.trim() || 'Quick Snippet');

      // Server-Side Encryption
      const isSecureType = input.type === 'password' || input.type === 'note' || input.type === 'clipboard';
      const isEncrypted = visibility === 'private' && isSecureType;
      // Opt-in content encryption for public items
      const isContentEncrypted = input.isContentEncrypted && visibility === 'public' && !isEncrypted;
      
      let finalContent = input.content;
      let finalPlainText = input.plainText;
      let finalUsername = input.username;
      let finalPassword = input.password;
      let encryptedContent = null;
      let encryptedPlainText = null;
      let encryptedUsername = null;
      let encryptedPassword = null;
      let encryptionIv = null;

      if (isEncrypted) {
        const encrypted = encryptItemFieldsServer({
          password: input.password,
          username: input.username,
          content: input.content,
          plainText: input.plainText,
        });
        
        finalContent = '';
        finalPlainText = '';
        finalUsername = undefined;
        // Store the encrypted password ciphertext in the encrypted_password column
        // (reused: plaintext for non-encrypted items, ciphertext for encrypted items)
        finalPassword = encrypted.encryptedPassword ?? undefined;
        encryptedContent = encrypted.encryptedContent;
        encryptedPlainText = encrypted.encryptedPlainText;
        encryptedUsername = encrypted.encryptedUsername;
        encryptedPassword = encrypted.encryptedPassword;
        encryptionIv = encrypted.encryptionIv;
      } else if (isContentEncrypted) {
        // Encrypt only content/plainText for public items (title/tags stay visible)
        const encrypted = encryptItemFieldsServer({
          content: input.content,
          plainText: input.plainText,
          password: undefined,
          username: undefined,
        });
        
        finalContent = '';
        finalPlainText = '';
        encryptedContent = encrypted.encryptedContent;
        encryptedPlainText = encrypted.encryptedPlainText;
        encryptionIv = encrypted.encryptionIv;
      }

      // ── Expiry handling (all users — optional) ──
      let finalExpiresAt: Date | null = null;
      if (input.expiresAt) {
        const expiryDate = new Date(input.expiresAt);
        const nowMs = Date.now();
        const diffMs = expiryDate.getTime() - nowMs;
        const MIN_EXPIRY_MS = 60 * 1000;                 // 1 minute
        const MAX_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

        if (diffMs < MIN_EXPIRY_MS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Expiry must be at least 1 minute from now",
          });
        }
        if (diffMs > MAX_EXPIRY_MS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Expiry cannot be more than 1 year from now",
          });
        }
        finalExpiresAt = expiryDate;
      }
      // If no expiresAt provided, finalExpiresAt stays null (no auto-deletion)

      const result = await withTransaction(async (client) => {
        // Insert the item (user_id may be NULL for anonymous)
        const insertResult = await client.query<VaultItemRow>(
          `INSERT INTO vault_items
             (user_id, type, visibility, title, content, plain_text,
              site_url, site_username, encrypted_password, images_json, is_important,
              is_encrypted, is_content_encrypted, encrypted_content, encrypted_plain_text, encrypted_username, encryption_iv,
              expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           RETURNING *`,
          [
            userId,
            input.type,
            visibility,
            finalTitle,
            finalContent,
            finalPlainText,
            input.siteUrl ?? null,
            finalUsername ?? null,
            finalPassword ?? null, // stored in encrypted_password column (legacy naming); nulled when server-side encrypted
            JSON.stringify(input.images ?? []),
            input.isImportant,
            isEncrypted,
            isContentEncrypted,
            encryptedContent,
            encryptedPlainText,
            encryptedUsername,
            encryptionIv,
            finalExpiresAt,
          ]
        );

        const item = insertResult.rows[0];

        // Upsert tags (handles null userId for anonymous)
        const tags = await upsertTagsForItem(
          userId,
          item.id,
          finalTags,
          client
        );

        return formatItem(item, tags);
      });

      (global as any).vaultEventEmitter?.emit('vault:update');
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

        // Server-Side Encryption evaluation
        const currentType = input.type ?? existing[0].type;
        const currentVisibility = input.visibility ?? existing[0].visibility;
        const isSecureType = currentType === 'password' || currentType === 'note' || currentType === 'clipboard';
        const isEncrypted = currentVisibility === 'private' && isSecureType;
        
        let finalContent = input.content;
        let finalPlainText = input.plainText;
        let finalUsername = input.username;
        let finalPassword = input.password;
        
        let encryptedContent: string | null | undefined = undefined;
        let encryptedPlainText: string | null | undefined = undefined;
        let encryptedUsername: string | null | undefined = undefined;
        let encryptedPassword: string | null | undefined = undefined;
        let encryptionIv: string | null | undefined = undefined;

        if (isEncrypted) {
          // If we are encrypting, we need the full fields, which might be in the existing row if not provided
          // Wait, if it's already encrypted and they only update title, we don't need to re-encrypt!
          // We only re-encrypt if they provide a NEW password, content, or plainText, OR if it wasn't encrypted before.
          const needsReencryption = 
            !existing[0].is_encrypted || 
            input.content !== undefined || 
            input.plainText !== undefined || 
            input.password !== undefined || 
            input.username !== undefined;
            
          if (needsReencryption) {
            // Decrypt the existing first if it was encrypted and we are only partially updating
            let baseContent = existing[0].content;
            let basePlainText = existing[0].plain_text;
            let baseUsername = existing[0].site_username;
            let basePassword = existing[0].encrypted_password;
            
            if (existing[0].is_encrypted && existing[0].encryption_iv) {
              try {
                const decrypted = decryptItemFieldsServer({
                  encryptedPassword: existing[0].encrypted_password,
                  encryptedUsername: existing[0].encrypted_username,
                  encryptedContent: existing[0].encrypted_content,
                  encryptedPlainText: existing[0].encrypted_plain_text,
                  encryptionIv: existing[0].encryption_iv,
                });
                baseContent = decrypted.content ?? '';
                basePlainText = decrypted.plainText ?? '';
                baseUsername = decrypted.username ?? null;
                basePassword = decrypted.password ?? null;
              } catch (e) {
                console.error("Failed to decrypt existing item for update:", input.id, e);
              }
            }
            
            const encryptInput = {
              content: input.content !== undefined ? input.content : baseContent,
              plainText: input.plainText !== undefined ? input.plainText : basePlainText,
              username: input.username !== undefined ? input.username : baseUsername,
              password: input.password !== undefined ? input.password : basePassword,
            };
            
            const encrypted = encryptItemFieldsServer({
              password: encryptInput.password || undefined,
              username: encryptInput.username || undefined,
              content: encryptInput.content || undefined,
              plainText: encryptInput.plainText || undefined,
            });
            
            finalContent = '';
            finalPlainText = '';
            finalUsername = null;
            // Store the encrypted password ciphertext in the encrypted_password column
            finalPassword = encrypted.encryptedPassword ?? null;
            encryptedContent = encrypted.encryptedContent;
            encryptedPlainText = encrypted.encryptedPlainText;
            encryptedUsername = encrypted.encryptedUsername;
            encryptedPassword = encrypted.encryptedPassword;
            encryptionIv = encrypted.encryptionIv;
          } else {
             // Keep existing encryption
             finalContent = undefined;
             finalPlainText = undefined;
             finalUsername = undefined;
             finalPassword = undefined;
          }
        } else {
          // Not encrypted - wipe encryption columns
          encryptedContent = null;
          encryptedPlainText = null;
          encryptedUsername = null;
          encryptedPassword = null;
          encryptionIv = null;
        }

        addField("type", input.type);
        addField("visibility", input.visibility);
        addField("title", input.title);
        addField("content", finalContent);
        addField("plain_text", finalPlainText);
        addField("site_url", input.siteUrl);
        addField("site_username", finalUsername);
        addField("encrypted_password", finalPassword);
        if (input.images !== undefined) {
          addField("images_json", JSON.stringify(input.images));
        }
        addField("is_important", input.isImportant);
        
        // E2E encryption fields
        addField("is_encrypted", isEncrypted);
        addField("encrypted_content", encryptedContent);
        addField("encrypted_plain_text", encryptedPlainText);
        addField("encrypted_username", encryptedUsername);
        addField("encryption_iv", encryptionIv);

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

      (global as any).vaultEventEmitter?.emit('vault:update');
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

      (global as any).vaultEventEmitter?.emit('vault:update');
      return { success: true, id: input.id };
    }),

  // ── Recover an item from trash (PRIVATE — login required)
  recoverItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      const result = await query(
        `UPDATE vault_items
         SET is_deleted = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_deleted = TRUE
         RETURNING id`,
        [input.id, userId]
      );

      if (!result.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found in trash",
        });
      }

      (global as any).vaultEventEmitter?.emit('vault:update');
      return { success: true, id: input.id };
    }),

  // ── Permanently delete an item (PRIVATE — login required)
  deleteItemPermanent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      // Also clean up tags (handled by ON DELETE CASCADE if set up, but let's be safe)
      await withTransaction(async (client) => {
        await client.query(`DELETE FROM vault_item_tags WHERE item_id = $1`, [input.id]);
        const result = await client.query(
          `DELETE FROM vault_items
           WHERE id = $1 AND user_id = $2 AND is_deleted = TRUE
           RETURNING id`,
          [input.id, userId]
        );

        if (!result.rowCount) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Item not found in trash",
          });
        }
      });

      (global as any).vaultEventEmitter?.emit('vault:update');
      return { success: true, id: input.id };
    }),

  // ── Toggle visibility (PRIVATE — login required) ────────
  toggleVisibility: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      // Combined verify + update: passwords can never be made public
      const result = await query<VaultItemRow>(
        `UPDATE vault_items
         SET visibility = CASE WHEN visibility = 'public' THEN 'private' ELSE 'public' END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
           AND NOT (type = 'password' AND visibility = 'private')
         RETURNING *`,
        [input.id, userId]
      );

      if (!result.length) {
        // Determine if it's not found or forbidden
        const exists = await query<{ type: string; visibility: string }>(
          `SELECT type, visibility FROM vault_items WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
          [input.id, userId]
        );
        if (exists.length && exists[0].type === 'password' && exists[0].visibility === 'private') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Password items must remain private" });
        }
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      // Fetch tags
      const tagRows = await query<ItemTagRow>(
        `SELECT vit.item_id, vt.id AS tag_id, vt.label, vt.color
         FROM vault_item_tags vit
         JOIN vault_tags vt ON vt.id = vit.tag_id
         WHERE vit.item_id = $1`,
        [input.id]
      );

      (global as any).vaultEventEmitter?.emit('vault:update');
      return formatItem(
        result[0],
        tagRows.map((r) => ({ id: r.tag_id, label: r.label, color: r.color }))
      );
    }),

  // ── Toggle importance (PRIVATE — login required) ────────
  toggleImportant: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      // Combined verify + update in a single query
      const result = await query<VaultItemRow>(
        `UPDATE vault_items
         SET is_important = NOT is_important,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
         RETURNING *`,
        [input.id, userId]
      );

      if (!result.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      const tagRows = await query<ItemTagRow>(
        `SELECT vit.item_id, vt.id AS tag_id, vt.label, vt.color
         FROM vault_item_tags vit
         JOIN vault_tags vt ON vt.id = vit.tag_id
         WHERE vit.item_id = $1`,
        [input.id]
      );

      (global as any).vaultEventEmitter?.emit('vault:update');
      return formatItem(
        result[0],
        tagRows.map((r) => ({ id: r.tag_id, label: r.label, color: r.color }))
      );
    }),

  // ── Increment copy count (PUBLIC — no auth required) ────
  incrementCopyCount: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await query(
        `UPDATE vault_items SET copy_count = copy_count + 1
         WHERE id = $1 AND visibility = 'public' AND is_deleted = FALSE`,
        [input.id]
      );
      // Intentionally no socket emit — copy count bumps don't need to broadcast to all clients
      return { success: true };
    }),

  // ── Decrypt content for copy (PUBLIC — no auth required) ──
  decryptContent: baseProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await query<VaultItemRow>(
        `SELECT * FROM vault_items WHERE id = $1 AND is_deleted = FALSE`,
        [input.id]
      );

      if (!rows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      const row = rows[0];

      // Only works for content-encrypted public items
      if (!row.is_content_encrypted || !row.encryption_iv) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Item is not content-encrypted" });
      }

      try {
        const decrypted = decryptItemFieldsServer({
          encryptedContent: row.encrypted_content,
          encryptedPlainText: row.encrypted_plain_text,
          encryptedPassword: null,
          encryptedUsername: null,
          encryptionIv: row.encryption_iv,
        });

        return {
          plainText: decrypted.plainText ?? '',
          content: decrypted.content ?? '',
        };
      } catch (e) {
        console.error('Failed to decrypt content for item:', input.id, e);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Decryption failed" });
      }
    }),

  // ── Get all distinct tags (PUBLIC — no auth required) ─────
  getAllTags: baseProcedure.query(async () => {
    const tags = await query<{ label: string; color: string; usage_count: string }>(
      `SELECT vt.label, vt.color, COUNT(vit.item_id)::text AS usage_count
       FROM vault_tags vt
       JOIN vault_item_tags vit ON vit.tag_id = vt.id
       JOIN vault_items vi ON vi.id = vit.item_id
       WHERE vi.visibility = 'public' AND vi.is_deleted = FALSE
       GROUP BY vt.label, vt.color
       ORDER BY COUNT(vit.item_id) DESC, vt.label ASC`
    );

    return tags.map((t) => ({
      label: t.label,
      color: t.color,
      count: parseInt(t.usage_count),
    }));
  }),

  // ══════════════════════════════════════════════════════════
  //  USER SETTINGS
  // ══════════════════════════════════════════════════════════

  // ── Get current user's settings ─────────────────────────
  getUserSettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.clerkUserId!);

    // Upsert + return in a single round-trip using CTE
    const rows = await query<UserSettingsRow>(
      `WITH ensure_row AS (
         INSERT INTO user_settings (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING
       )
       SELECT user_id, show_profile_on_public, auto_tag_enabled
       FROM user_settings WHERE user_id = $1`,
      [userId]
    );

    return {
      showProfileOnPublic: rows[0]?.show_profile_on_public ?? false,
      autoTagEnabled: rows[0]?.auto_tag_enabled ?? true,
    };
  }),

  // ── Update user settings ────────────────────────────────
  updateUserSettings: protectedProcedure
    .input(
      z.object({
        showProfileOnPublic: z.boolean(),
        autoTagEnabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);

      await query(
        `INSERT INTO user_settings (user_id, show_profile_on_public, auto_tag_enabled, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id)
         DO UPDATE SET show_profile_on_public = $2, auto_tag_enabled = $3, updated_at = CURRENT_TIMESTAMP`,
        [userId, input.showProfileOnPublic, input.autoTagEnabled]
      );

      (global as any).vaultEventEmitter?.emit('vault:update');
      return { success: true, showProfileOnPublic: input.showProfileOnPublic, autoTagEnabled: input.autoTagEnabled };
    }),

  // ── Get a user's public profile (no auth — anyone can hover) ──
  getUserProfile: baseProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      // Only return data if the user opted in
      const settings = await query<UserSettingsRow>(
        `SELECT * FROM user_settings WHERE user_id = $1`,
        [input.userId]
      );

      if (!settings.length || !settings[0].show_profile_on_public) {
        return null; // user has not opted in
      }

      // User info
      const userRows = await query<{ id: number; name: string; created_at: Date }>(
        `SELECT id, name, created_at FROM users WHERE id = $1`,
        [input.userId]
      );

      if (!userRows.length) return null;
      const user = userRows[0];

      // Item counts by type
      const countRows = await query<{ type: string; count: string }>(
        `SELECT type, COUNT(*)::text AS count
         FROM vault_items
         WHERE user_id = $1 AND visibility = 'public' AND is_deleted = FALSE
         GROUP BY type`,
        [input.userId]
      );

      const counts: Record<string, number> = {};
      let totalPublicItems = 0;
      for (const row of countRows) {
        counts[row.type] = parseInt(row.count);
        totalPublicItems += parseInt(row.count);
      }

      // Tag count
      const tagCountRows = await query<{ count: string }>(
        `SELECT COUNT(DISTINCT vt.id)::text AS count
         FROM vault_tags vt
         WHERE vt.user_id = $1`,
        [input.userId]
      );
      const totalTags = parseInt(tagCountRows[0]?.count ?? "0");

      // Activity data: items created per week for the last 12 weeks
      const activityRows = await query<ActivityRow>(
        `SELECT date_trunc('week', created_at)::text AS week_start,
                COUNT(*)::text AS count
         FROM vault_items
         WHERE user_id = $1
           AND is_deleted = FALSE
           AND created_at >= NOW() - INTERVAL '12 weeks'
         GROUP BY date_trunc('week', created_at)
         ORDER BY week_start ASC`,
        [input.userId]
      );

      // Fill in missing weeks with 0
      const activityData: { week: string; count: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekKey = weekStart.toISOString().split("T")[0];
        const match = activityRows.find((r) => r.week_start.startsWith(weekKey));
        activityData.push({
          week: weekKey,
          count: match ? parseInt(match.count) : 0,
        });
      }

      return {
        name: user.name,
        memberSince: user.created_at.toISOString(),
        totalPublicItems,
        passwordCount: counts["password"] ?? 0,
        noteCount: counts["note"] ?? 0,
        clipboardCount: counts["clipboard"] ?? 0,
        totalTags,
        activityData,
      };
    }),

  // ══════════════════════════════════════════════════════════
  //  ENCRYPTION SALT (stored server-side as backup)
  // ══════════════════════════════════════════════════════════

  getEncryptionSalt: protectedProcedure.query(async ({ ctx }) => {
    const userId = await resolveUserId(ctx.clerkUserId!);
    const rows = await query<{ encryption_salt: string | null }>(
      `SELECT encryption_salt FROM user_settings WHERE user_id = $1`,
      [userId]
    );
    return { salt: rows[0]?.encryption_salt ?? null };
  }),

  setEncryptionSalt: protectedProcedure
    .input(z.object({ salt: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = await resolveUserId(ctx.clerkUserId!);
      await query(
        `INSERT INTO user_settings (user_id, encryption_salt)
         VALUES ($1, $2)
         ON CONFLICT (user_id)
         DO UPDATE SET encryption_salt = $2, updated_at = CURRENT_TIMESTAMP`,
        [userId, input.salt]
      );
      return { success: true };
    }),
});

