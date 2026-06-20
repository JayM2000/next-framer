# 🏗️ VAULT APP — CANVAS EDITOR REDESIGN PROMPT

## CONTEXT: WHAT EXISTS NOW

The current Vault app is a dark-themed clipboard & password manager built with **Next.js, shadcn/ui, Tailwind CSS, Framer Motion, Neon PostgreSQL, and Upstash Redis**. It currently shows:
- A **left sidebar** with: Dashboard, Private Vault, Categories (Passwords, Secure Notes, Clipboard Snippets), Settings, Trash
- A **main card-grid area** (Public Board) displaying items as cards with copy-count, tags, encrypted badges, and Copy/Stats actions
- A **right panel** Quick Snippet creator with a rich-text toolbar
- **User states**: Anonymous (not logged in) vs. authenticated users (shown by display name)
- **Encryption toggle** per item, Auto-Tag setting in Settings

**Color tokens already in use** (keep them exactly):
- Background: `#0d0d0d` (near-black)
- Card surface: `#141414` / `#1a1a1a`
- Accent gold: `#D4A827` (button, logo, highlights)
- Accent orange: `#FF6B2B` (trending badge)
- Text primary: `#FFFFFF`
- Text muted: `#6B7280`
- Border: `#2a2a2a`
- Tag purple: `#6366F1`, tag green: `#22C55E`

---

## OBJECTIVE: REPLACE CARDS WITH A CANVAS-EDITOR SYSTEM

**Completely replace** the card-grid dashboard with a **Session-based Canvas Editor**, similar in spirit to Notion's page system but visually staying in the Vault dark/gold identity. The entire main content area becomes a canvas workspace. Cards are gone. Sessions are the new core unit of the app.

---

## ARCHITECTURE OVERVIEW

```
┌────────────────────────────────────────────────────────────────────┐
│  Topbar (unchanged: Search, Settings, Theme, Login/Avatar)         │
├──────────────┬─────────────────────────────────────────────────────┤
│              │                                                       │
│  LEFT        │   CANVAS EDITOR AREA                                 │
│  SIDEBAR     │                                                       │
│  (Sessions   │   [Session is open here as a full-page document]     │
│   as menu)   │   - Rich text editor                                 │
│              │   - Blocks: text, image, password, note, link        │
│  ── ──       │   - Inline @mention, #tag, [[session-link]]          │
│  [+ New      │   - Presence bar (who's here)                        │
│   Session]   │   - Floating toolbar on text select                  │
│              │                                                       │
│  Dashboard   │                                                       │
│  ▶ Session 1 │                                                       │
│  ▶ Session 2 │                                                       │
│  ▶ Session 3 │                                                       │
│    ...       │                                                       │
│              │                                                       │
│  ── SYSTEM ──│                                                       │
│  Settings    │                                                       │
│  Trash       │                                                       │
└──────────────┴─────────────────────────────────────────────────────┘
```

---

## PART 1 — DATABASE SCHEMA (Neon PostgreSQL)

Create these new tables / migrate existing ones:

```sql
-- Sessions (replaces the old "items/cards" concept as the top-level container)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Session',
  emoji TEXT DEFAULT '📄',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  is_encrypted BOOLEAN DEFAULT false,
  encrypted_key TEXT,
  tags TEXT[] DEFAULT '{}',
  position INTEGER DEFAULT 0,          -- for sidebar ordering
  parent_id UUID REFERENCES sessions(id) ON DELETE CASCADE, -- nested sessions
  copy_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks inside a session (the canvas editor content)
CREATE TABLE session_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                  -- 'text' | 'image' | 'password' | 'note' | 'divider' | 'code' | 'link'
  content JSONB NOT NULL DEFAULT '{}', -- block-type-specific data
  position INTEGER NOT NULL DEFAULT 0, -- order within session
  is_encrypted BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags (hashtag registry)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,           -- e.g. "kubernetes"
  color TEXT DEFAULT '#6366F1',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session ↔ Tag many-to-many
CREATE TABLE session_tags (
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, tag_id)
);

-- Real-time presence (use Upstash Redis for live; this is for audit)
CREATE TABLE session_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = anonymous
  display_name TEXT,                   -- resolved at query time from settings
  is_editing BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Session links (cross-references between sessions)
CREATE TABLE session_links (
  source_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  target_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  PRIMARY KEY (source_session_id, target_session_id)
);
```

**Block `content` JSONB shapes by type:**
```json
// type: "text"
{ "html": "<p>Hello <strong>world</strong></p>", "plainText": "Hello world" }

// type: "image"
{ "url": "https://...", "alt": "Description", "width": 800, "height": 600, "caption": "..." }

// type: "password"
{ "label": "Gmail", "username": "user@gmail.com", "encryptedPassword": "...", "url": "https://mail.google.com", "notes": "" }

// type: "note"
{ "title": "Note title", "body": "Note content", "color": "#1a1a2e" }

// type: "code"
{ "language": "javascript", "code": "const x = 1;" }

// type: "link"
{ "url": "https://...", "title": "Page Title", "description": "...", "favicon": "..." }

// type: "divider"
{ "style": "solid" | "dashed" | "gradient" }

// type: "session-embed"
{ "targetSessionId": "uuid", "targetTitle": "Session Name", "preview": "first 100 chars..." }
```

---

## PART 2 — REAL-TIME PRESENCE (Upstash Redis)

Use **Upstash Redis** with sorted sets to track who is actively in a session. Update every 30 seconds; expire after 90 seconds of inactivity.

```typescript
// Redis key pattern:
// presence:{sessionId} → Hash { userId/anonId: JSON stringified PresenceEntry }

interface PresenceEntry {
  userId: string | null;       // null for anonymous
  displayName: string;         // "Jay", "Unknown User", "Anonymous #4"
  avatarColor: string;         // deterministic color from userId hash
  isEditing: boolean;
  lastSeen: number;            // unix ms timestamp
  showPublicProfile: boolean;  // from user settings
}
```

**Presence resolution rules:**
1. User is **logged in** AND `settings.showPublicProfile = true` → show `user.displayName` (e.g. "Jay")
2. User is **logged in** AND `settings.showPublicProfile = false` → show `"Unknown User"`
3. User is **not logged in** → show `"Anonymous"` with a deterministic number suffix based on their session cookie (e.g. "Anonymous #3")
4. If the current viewer **created** the session → they always see their own name (never anonymized to themselves)

**API route:** `POST /api/sessions/[sessionId]/presence`
- Call on: page open, every 30s heartbeat, edit start/stop, page close
- Response: array of all current `PresenceEntry[]` for that session

**UI presence bar:** shown at the **top of each open session**, right-aligned below the session title:
```
👁 Viewing: Jay (you)  ·  Unknown User  ·  Anonymous #2    ✏️ Editing: Jay (you)
```
Avatars are small colored circles (20px) with initials.

---

## PART 3 — LEFT SIDEBAR (Session Navigator)

Replace the current sidebar categories with a **Sessions list**. Keep existing system links (Settings, Trash) at the bottom.

### Sidebar Structure
```
┌─────────────────────────┐
│  ☰  VAULT               │    ← keep current logo/branding
├─────────────────────────┤
│  [+ New Session]        │    ← gold button, same as "+ New Item"
├─────────────────────────┤
│  🔍 Search sessions...  │    ← inline filter for sidebar only
├─────────────────────────┤
│  SESSIONS               │    ← section label
│                         │
│  📄 Session One         │    ← emoji + title
│  📄 Session Two         │    ← active = gold left-border + bg highlight
│  🔒 Encrypted Session   │    ← lock icon if encrypted
│  📝 My Notes            │
│  🔑 Passwords           │
│     └─ Sub-session      │    ← nested, indented 12px, collapsible
│  📎 Clipboard           │
│  ...                    │
├─────────────────────────┤
│  SYSTEM                 │
│  ⚙️  Settings           │
│  🗑️  Trash              │
└─────────────────────────┘
```

### Sidebar Behaviors
- **Drag to reorder** sessions using `@dnd-kit/core`
- **Right-click context menu** on any session: Rename, Duplicate, Add Sub-session, Move to Trash, Copy Link, Toggle Encryption
- **Collapse/expand** nested sessions with an animated chevron
- **Active session** highlighted with a `2px solid #D4A827` left border and `#1a1a1a` background
- **Unread indicator**: a small gold dot if the session was updated since last visit
- **Session count badge**: small muted counter showing block count

### Sidebar Animations (Framer Motion)
```typescript
// Session list item mount/unmount
variants={{
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.12 } }
}}

// Nested children expand/collapse
variants={{
  open: { height: "auto", opacity: 1 },
  closed: { height: 0, opacity: 0 }
}}
transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
```

---

## PART 4 — CANVAS EDITOR (Main Area)

When a session is opened from the sidebar, the entire main area becomes the **Session Canvas Editor**.

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [←] Breadcrumb: Dashboard / Session Name                   │  ← top breadcrumb
│  ─────────────────────────────────────────────────────────  │
│  📄  [Session Title — editable H1 inline]                   │  ← click to rename
│  Tags: [kubernetes] [eks] + Add tag...                      │  ← inline tag pills
│  👁  Jay (you) · Unknown User · Anonymous #2               │  ← presence bar
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Block 1 — Text block with full rich text]                 │
│                                                             │
│  [Block 2 — Password block]                                 │
│  ┌──────────────────────────────┐                          │
│  │ 🔑 Gmail                    │                          │
│  │ user@gmail.com  [👁 Reveal] │                          │
│  │ 🔗 mail.google.com          │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  [Block 3 — Image with caption]                             │
│  ┌──────────────────────────────┐                          │
│  │        [Image]               │                          │
│  │  Caption text here           │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  [Block 4 — Session embed link]                             │
│  ┌──────────────────────────────┐                          │
│  │ 📄 → Linked Session Name    │                          │
│  │ "Preview of first 100 chars" │                          │
│  └──────────────────────────────┘                          │
│                                                             │
│  ╔═══════════════════════════╗                             │
│  ║  Type / to add a block... ║  ← slash command prompt    │
│  ╚═══════════════════════════╝                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Animation (between sessions)
When user clicks a session in the sidebar:
```typescript
// Outgoing session
exit: { opacity: 0, y: 10, transition: { duration: 0.15 } }

// Incoming session
initial: { opacity: 0, y: 16 }
animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
```
Use `AnimatePresence` with `mode="wait"` so the old session fades out before the new one fades in.

---

## PART 5 — EDITOR FEATURES (detailed spec)

### 5.1 Rich Text Editor
Use **Tiptap** (recommended for Next.js/React) as the editor engine.

Extensions to enable:
- `StarterKit` (bold, italic, underline, strike, h1-h3, lists, blockquote, code, hr)
- `Placeholder` — "Type something, or press / for commands..."
- `Image` with resize handles
- `Link` with auto-detect
- Custom `Mention` extension for `@user` mentions
- Custom `HashTag` extension for `#tag` inline
- Custom `SessionLink` extension for `[[Session Name]]` syntax
- `CodeBlockLowlight` for syntax highlighted code blocks
- `TaskList` + `TaskItem` for checkboxes
- `CharacterCount`
- `Collaboration` if using real-time collab (optional — see §5.5)

**Floating Toolbar**: appears on text selection
```
[ B ] [ I ] [ U ] [ S ] [ ~~~ ] | [ H1 ] [ H2 ] [ H3 ] | [ " ] | [ </> ] | [ Link ] | [ Color ]
```
Style: `bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg shadow-xl px-2 py-1 flex gap-1`

**Slash Command Menu** — triggered by typing `/` in an empty block:
```
/text          → Plain text block
/h1            → Heading 1
/h2            → Heading 2
/image         → Upload or paste image
/password      → Password block
/note          → Note block
/code          → Code block
/divider       → Horizontal divider
/link          → URL embed (auto-fetch title/favicon)
/session       → Link to another session [[...]]
/checkbox      → Task item
/quote         → Blockquote
```
Slash menu UI: dark floating panel, arrow-key navigable, fuzzy-searchable, Framer Motion slide-in from bottom.

### 5.2 @Mentions
- Typing `@` opens an inline dropdown listing all **known users** who have sessions (public profile enabled) + yourself
- Unknown/private-profile users are NOT listed
- Selected mention renders as: `<span class="mention" data-user-id="...">@Jay</span>` — styled as a teal pill
- Sends a notification to the mentioned user (via Upstash Redis pub/sub or Next.js Server Actions)

### 5.3 #Hashtags
- Typing `#` followed by text opens a tag autocomplete dropdown listing existing tags
- Pressing Enter or Space finalizes the tag: `<span class="hashtag">#kubernetes</span>` — styled as a gold pill
- New tag names auto-create an entry in the `tags` table
- Tags at the block level are also synced to the session-level `tags[]` array for sidebar filter

### 5.4 [[Session Links]]
- Typing `[[` opens an inline search dropdown of all sessions the user can access
- Selecting a session inserts a **session-embed block** (or inline link depending on context)
- Rendered as: `📄 → Session Name` with a preview snippet
- **On click**: triggers the animated session navigation (same as sidebar click) — navigates to that session
- Bidirectional: when session A links to session B, session B's "backlinks" panel shows session A

### 5.5 Image Upload
- Drag-and-drop OR click "+ Image" block from slash menu
- Upload to your existing storage (Supabase Storage / Cloudflare R2 / whatever is configured)
- Show upload progress bar inside the block
- After upload: renders as full-width image with optional caption field below
- Right-click on image: Resize (25%, 50%, 75%, 100%), Set Alt Text, Delete, Download

### 5.6 Password Block
Rendered as a styled card within the session:
```
┌─────────────────────────────────────────────┐
│ 🔑  [Site Label]                [⋮ menu]   │
│     Username: user@example.com   [📋 Copy]  │
│     Password: ●●●●●●●●●●●●      [👁][📋]   │
│     URL: https://example.com     [↗ Open]   │
│     Notes: ...                              │
└─────────────────────────────────────────────┘
```
- Password is **always encrypted** (regardless of session encryption toggle)
- Uses same encryption key system already in place
- `[👁 Reveal]` decrypts and shows plain text temporarily for 30 seconds, then re-hides
- Can edit inline by clicking any field

### 5.7 Note Block
A colored sticky-note style block:
```
┌─────────────────────────────────┐
│ 📝  Note Title                  │
│     Note body text here...      │
│                       [#1a1a2e] │  ← color picker
└─────────────────────────────────┘
```
Colors available: 8 preset dark-tone colors matching the Vault palette

### 5.8 Block Management
- **Hover** any block → shows a `⠿` drag handle on the left + `+` add block below + `⋮` block menu on right
- **Drag handle**: drag blocks to reorder (using `@dnd-kit`)
- **Block menu (⋮)**: Delete, Duplicate, Move Up, Move Down, Convert to (text/note/code/etc.), Copy block as text, Toggle encrypt
- **Keyboard shortcuts**:
  - `Ctrl+Z` / `Cmd+Z` — undo
  - `Ctrl+Shift+Z` — redo
  - `Ctrl+/` — toggle slash menu
  - `Backspace` on empty block — deletes block, merges with above
  - `Enter` at end of block — creates new text block below

---

## PART 6 — SESSION HEADER

Each open session shows a header area above the editor:

```typescript
interface SessionHeader {
  emoji: string;           // large (2rem) emoji prefix, clickable to change
  title: string;           // editable H1, click to focus, blur to save
  tags: Tag[];             // inline pill list, "+Add" opens tag selector
  presenceBar: Presence[]; // avatars of current viewers/editors
  breadcrumb: string[];    // e.g. ["Dashboard", "Passwords", "Gmail Stuff"]
  lastEdited: string;      // "Edited 2 minutes ago by Jay"
  isPublic: boolean;       // 🌐 or 🔒 icon indicating visibility
  isEncrypted: boolean;    // 🛡️ icon if encrypted
}
```

**Emoji picker**: clicking the emoji opens a floating emoji picker (use `emoji-picker-react` or similar)

**Inline title editing**:
- Click the H1 title → becomes a `contenteditable` or controlled input
- `Enter` → saves and moves focus to first block
- `Escape` → cancels edit

**Last edited line**: `"Edited [relative time] by [display name or 'an anonymous user']"` — pull from `sessions.updated_at` + presence data

---

## PART 7 — DASHBOARD VIEW (no session open)

When no session is selected (app first opens), show a **canvas landing view** instead of the card grid:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ✦  Welcome back, Jay                            │
│      [Today's date]                                 │
│                                                     │
│  ─── RECENTLY VISITED ──────────────────────────   │
│  [Session card] [Session card] [Session card]       │
│  (3-column, compact horizontal scroll on mobile)    │
│                                                     │
│  ─── TRENDING  (most viewed/copied) ────────────   │
│  [Session card] [Session card] [Session card]       │
│                                                     │
│  ─── PINNED ────────────────────────────────────   │
│  [Session card] [Session card]                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Session card** (mini version, for dashboard only):
```
┌──────────────────────────────┐
│  📄  Session Name            │
│  ─────────────────────────── │
│  Preview of first 60 chars...│
│  ─────────────────────────── │
│  [kubernetes] [eks]          │
│  👁 3 viewing  · 📋 16 copies │
└──────────────────────────────┘
```
Cards are **click targets only** — clicking opens the session in the canvas editor. No inline copy/edit actions on the card. Cards use the existing dark card surface `#141414` with `border-[#2a2a2a]` and gold hover glow: `hover:border-[#D4A827]/40 hover:shadow-[0_0_12px_#D4A82720]`

---

## PART 8 — COMPONENTS TO BUILD

```
src/
├── components/
│   ├── canvas/
│   │   ├── CanvasEditor.tsx           ← main editor container
│   │   ├── CanvasHeader.tsx           ← session title, emoji, tags, presence
│   │   ├── PresenceBar.tsx            ← live viewer avatars
│   │   ├── BreadcrumbNav.tsx          ← path navigation
│   │   └── SessionDashboard.tsx       ← no-session-open landing
│   │
│   ├── blocks/
│   │   ├── BlockWrapper.tsx           ← drag handle, block menu, hover states
│   │   ├── TextBlock.tsx              ← Tiptap rich text
│   │   ├── ImageBlock.tsx             ← image + caption
│   │   ├── PasswordBlock.tsx          ← password card
│   │   ├── NoteBlock.tsx              ← sticky note
│   │   ├── CodeBlock.tsx              ← syntax-highlighted code
│   │   ├── LinkBlock.tsx              ← URL embed with preview
│   │   ├── SessionLinkBlock.tsx       ← linked session preview card
│   │   ├── DividerBlock.tsx           ← styled divider
│   │   └── SlashCommandMenu.tsx       ← / command palette
│   │
│   ├── editor/
│   │   ├── FloatingToolbar.tsx        ← selection formatting toolbar
│   │   ├── MentionDropdown.tsx        ← @mention inline picker
│   │   ├── HashTagDropdown.tsx        ← #hashtag inline picker
│   │   └── SessionLinkDropdown.tsx    ← [[session]] inline picker
│   │
│   ├── sidebar/
│   │   ├── SessionSidebar.tsx         ← full sidebar container
│   │   ├── SessionListItem.tsx        ← single session row
│   │   ├── SessionContextMenu.tsx     ← right-click menu
│   │   └── SidebarSearch.tsx         ← inline filter
│   │
│   └── shared/
│       ├── EmojiPicker.tsx            ← session emoji selector
│       ├── TagPill.tsx                ← reusable tag component
│       └── AvatarCircle.tsx          ← presence avatar
│
├── hooks/
│   ├── useSession.ts                 ← fetch/update session data
│   ├── useBlocks.ts                  ← CRUD for blocks in a session
│   ├── usePresence.ts                ← Redis presence heartbeat
│   ├── useSessionNavigation.ts       ← animated session switching
│   └── useSlashCommand.ts            ← / command state machine
│
├── app/
│   ├── (canvas)/
│   │   ├── layout.tsx                ← sidebar + canvas layout
│   │   ├── page.tsx                  ← dashboard (no session)
│   │   └── session/
│   │       └── [sessionId]/
│   │           └── page.tsx          ← individual session page
│   └── api/
│       ├── sessions/
│       │   ├── route.ts              ← GET list, POST create
│       │   └── [sessionId]/
│       │       ├── route.ts          ← GET, PATCH, DELETE
│       │       ├── blocks/
│       │       │   └── route.ts      ← GET blocks, POST block
│       │       └── presence/
│       │           └── route.ts      ← POST heartbeat, GET viewers
│       └── tags/
│           └── route.ts              ← GET all tags, POST new tag
```

---

## PART 9 — PRESENCE SYSTEM IMPLEMENTATION

```typescript
// hooks/usePresence.ts
export function usePresence(sessionId: string) {
  const [viewers, setViewers] = useState<PresenceEntry[]>([]);

  useEffect(() => {
    // POST to presence API immediately on mount
    const heartbeat = async () => {
      const res = await fetch(`/api/sessions/${sessionId}/presence`, {
        method: 'POST',
        body: JSON.stringify({ isEditing: false })
      });
      const data = await res.json();
      setViewers(data.viewers);
    };

    heartbeat();
    const interval = setInterval(heartbeat, 30_000);

    // On unmount, send leave signal
    return () => {
      clearInterval(interval);
      fetch(`/api/sessions/${sessionId}/presence`, {
        method: 'DELETE',
        keepalive: true
      });
    };
  }, [sessionId]);

  return { viewers };
}
```

**Redis API route** (`/api/sessions/[sessionId]/presence/route.ts`):
```typescript
// POST — upsert presence entry
// Uses: await redis.hset(`presence:${sessionId}`, userId, JSON.stringify(entry))
// Uses: await redis.expire(`presence:${sessionId}`, 90)

// GET — get all active viewers
// Uses: await redis.hgetall(`presence:${sessionId}`)
// Filter out entries where lastSeen < Date.now() - 90000

// DELETE — remove own presence
// Uses: await redis.hdel(`presence:${sessionId}`, userId)
```

**Privacy resolution** (in the API route):
```typescript
async function resolveDisplayName(userId: string | null, settings: UserSettings): Promise<string> {
  if (!userId) return 'Anonymous';
  if (!settings.showPublicProfile) return 'Unknown User';
  return settings.displayName || 'Unknown User';
}
```

---

## PART 10 — SESSION LINK NAVIGATION

When user clicks a `[[Session Link]]` block or a session in the sidebar:

```typescript
// hooks/useSessionNavigation.ts
export function useSessionNavigation() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateTo = async (sessionId: string) => {
    setIsNavigating(true);
    // Framer Motion exit animation completes in ~150ms
    await new Promise(r => setTimeout(r, 150));
    router.push(`/session/${sessionId}`);
    setIsNavigating(false);
  };

  return { navigateTo, isNavigating };
}
```

In the session page, wrap content with `AnimatePresence mode="wait"`:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={sessionId}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }}
    exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
  >
    <CanvasEditor sessionId={sessionId} />
  </motion.div>
</AnimatePresence>
```

---

## PART 11 — SETTINGS INTEGRATION

In **Settings**, add a new section:

```
PROFILE VISIBILITY
[ ] Show public profile name to other users
    When enabled, your name appears as "Jay" in session presence.
    When disabled, you appear as "Unknown User" to others.

SESSIONS
[ ] Enable Auto-Tag on sessions (AI-generated tags)
[ ] Default encryption for new sessions
[ ] Show backlinks panel in sessions

CANVAS
[ ] Show block handles on hover (vs. always visible)
[ ] Default block type when pressing Enter
```

---

## PART 12 — MIGRATION NOTES

1. **Existing items/cards** → Each existing item becomes a **session** with a single `text` block containing its content. Tags are migrated to `session_tags`.
2. **Encrypted items** → `is_encrypted: true` on the session and block level; encrypted key remains the same.
3. **Copy count** → `sessions.copy_count` (keep the copy functionality — copying the session's full text to clipboard, tracked the same way).
4. **Public Board** → becomes sessions with `is_public: true`, shown on the Dashboard when not logged in.
5. **Private Vault** → sessions with `is_public: false` (owner-only visible).

---

## PART 13 — STYLING REFERENCE

Keep the **exact color tokens** from the existing app. Additional UI specifics:

```css
/* Canvas editor container */
.canvas-editor {
  background: #0d0d0d;
  min-height: 100vh;
  max-width: 760px;  /* comfortable reading width */
  margin: 0 auto;
  padding: 48px 24px 200px;
}

/* Session title H1 */
.session-title {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  outline: none;
  border: none;
  background: transparent;
  width: 100%;
  cursor: text;
}

/* Block hover state */
.block-wrapper:hover {
  background: #141414;
  border-radius: 6px;
}

/* Presence avatar */
.presence-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  margin-left: -6px; /* stacked overlap */
}

/* Session link block */
.session-link-block {
  border: 1px solid #2a2a2a;
  border-left: 3px solid #D4A827;
  border-radius: 6px;
  padding: 12px 16px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.session-link-block:hover {
  border-color: #D4A827;
  box-shadow: 0 0 12px #D4A82720;
}

/* Slash command menu */
.slash-menu {
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  width: 280px;
  max-height: 320px;
  overflow-y: auto;
}

/* Password block */
.password-block {
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 14px 16px;
}
.password-block:hover {
  border-color: #D4A827/30;
}

/* Hashtag pill (inline) */
.hashtag-inline {
  background: #D4A82718;
  color: #D4A827;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.875em;
  cursor: pointer;
}

/* Mention pill (inline) */
.mention-inline {
  background: #6366F118;
  color: #818CF8;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.875em;
  cursor: pointer;
}
```

---

## PART 14 — WHAT TO KEEP FROM OLD DESIGN

Do NOT remove these features — integrate them into the new system:

- ✅ **Encrypt/Decrypt** toggle — per-session and per-block level
- ✅ **Copy to clipboard** — available via session header "Copy All" button and per-block copy
- ✅ **Stats** — moved to a session info panel (slide-out or popover): total views, copies, unique visitors
- ✅ **Auto-Tag** (Settings toggle) — now applies to session-level tags
- ✅ **Trending** — shown on dashboard as a "Trending Sessions" horizontal scroll section
- ✅ **Has Links filter** — sessions with [[links]] get a 🔗 badge in the sidebar
- ✅ **Search** — top search bar now searches session titles + block content
- ✅ **Theme toggle** (dark/light) — keep in topbar
- ✅ **Login/Avatar** — keep in topbar
- ✅ **Trash** — deleted sessions go to Trash, recoverable for 30 days
- ✅ **Extract Text** button — keep as a block action for image blocks (OCR)

---

## SUMMARY OF CHANGES

| Was | Now |
|-----|-----|
| Card grid (Public Board) | Canvas editor with sessions |
| "New Item" button | "New Session" button |
| Card with copy/stats/tags | Session with full editor + blocks |
| Right panel Quick Snippet | Inline block creation via `/` command |
| Category sidebar items | Session list in sidebar |
| Clipboard Snippets / Passwords / Secure Notes categories | Block types within any session |
| Anonymous user name display | Presence system with privacy setting |
| Static card layout | Animated session navigation |

---

## ACCEPTANCE CRITERIA

- [ ] Clicking any session in the sidebar opens it with a smooth fade+slide animation
- [ ] Sessions persist all blocks to PostgreSQL on every change (debounced 500ms)
- [ ] Presence bar updates every 30 seconds; avatars appear/disappear correctly
- [ ] `/` command menu shows all block types, is keyboard navigable, closeable with Escape
- [ ] `[[` triggers session search dropdown; clicking result inserts session-link block
- [ ] `#` triggers tag autocomplete; finalizing creates/selects tag and styles as inline pill
- [ ] `@` triggers user mention dropdown; mention stored in block HTML
- [ ] Clicking a session-link block navigates to that session with animation
- [ ] Password blocks always encrypt; reveal works for 30s then re-hides
- [ ] Public profile OFF → current user appears as "Unknown User" to others; ON → shows display name
- [ ] Not-logged-in users appear as "Anonymous" in presence
- [ ] Settings page has "Show public profile" toggle that affects presence display globally
- [ ] All existing encrypted content decrypts and re-encrypts correctly under new block schema
- [ ] Mobile-responsive: sidebar collapses to hamburger menu; canvas editor uses full width
- [ ] Drag-to-reorder works for both sidebar sessions and blocks within a session
