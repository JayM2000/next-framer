export type ItemType = 'password' | 'note' | 'clipboard';
export type Visibility = 'public' | 'private';

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface VaultItem {
  id: string;
  userId?: number | null;  // null = anonymous item
  type: ItemType;
  visibility: Visibility;
  title: string;
  content: string;       // rich HTML string from TipTap
  plainText: string;     // stripped version for search/preview
  tags: Tag[];
  copyCount?: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean; // For trash feature
  isImportant?: boolean; // For important card feature
  // Password-specific:
  siteUrl?: string;
  username?: string;
  password?: string;
  // Image support:
  images?: string[];     // base64 data URLs
  // Extracted clickable URLs from content:
  extractedUrls?: { url: string; label: string }[];
  // Opt-in content encryption for public items:
  isContentEncrypted?: boolean; // content is encrypted, only revealed on copy
  // Item expiry (for anonymous items):
  expiresAt?: string;          // ISO date string — null means no expiry
  // Owner info (populated on public items):
  ownerName?: string;         // author display name (from DB join)
  ownerShowProfile?: boolean; // whether owner enabled public profile visibility
}

export interface AuthState {
  isLoggedIn: boolean;
  username: string | null;
}

export interface AppState {
  auth: AuthState;
  items: VaultItem[];
  searchQuery: string;
  selectedTags: string[];
  toast: { message: string; visible: boolean; type: 'success' | 'error' | 'warning' };
  activeTab: 'dashboard' | 'vault' | 'create';
  activeCategory: 'all' | 'passwords' | 'notes' | 'clipboard' | 'private' | 'trash';
  drawerOpen: boolean;
  sidebarOpen: boolean;
  // Session-based canvas editor state
  activeSessionId: string | null;
}

export type AppAction =
  | { type: 'LOGIN'; username: string }
  | { type: 'LOGOUT' }
  | { type: 'ADD_ITEM'; item: VaultItem; onSuccess?: () => void; onError?: (error: { message: string }) => void; onSettled?: () => void }
  | { type: 'UPDATE_ITEM'; item: VaultItem; onSuccess?: () => void; onError?: (error: { message: string }) => void; onSettled?: () => void }
  | { type: 'DELETE_ITEM'; id: string; onSuccess?: () => void; onError?: (error: { message: string }) => void; onSettled?: () => void }
  | { type: 'RECOVER_ITEM'; id: string; onSuccess?: () => void; onError?: (error: { message: string }) => void; onSettled?: () => void }
  | { type: 'DELETE_ITEM_PERMANENT'; id: string; onSuccess?: () => void; onError?: (error: { message: string }) => void; onSettled?: () => void }
  | { type: 'TOGGLE_VISIBILITY'; id: string; onSuccess?: () => void; onError?: (error: { message: string }) => void; onSettled?: () => void }
  | { type: 'TOGGLE_IMPORTANT'; id: string; onSuccess?: () => void; onError?: (error: { message: string }) => void; onSettled?: () => void }
  | { type: 'INCREMENT_COPY_COUNT'; id: string }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_SELECTED_TAGS'; tags: string[] }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_TAB'; tab: AppState['activeTab'] }
  | { type: 'SET_DRAWER'; open: boolean }
  | { type: 'SET_CATEGORY'; category: AppState['activeCategory'] }
  | { type: 'SET_SIDEBAR'; open: boolean }
  | { type: 'SET_ACTIVE_SESSION'; sessionId: string | null };

// ══════════════════════════════════════════════════════════
//  SESSION / CANVAS EDITOR TYPES
// ══════════════════════════════════════════════════════════

export type BlockType = 'text' | 'image' | 'password' | 'note' | 'divider' | 'code' | 'link' | 'session-embed';

export interface Session {
  id: string;
  title: string;
  emoji: string;
  ownerId: number | null;
  isPublic: boolean;
  isEncrypted: boolean;
  tags: Tag[];
  position: number;
  parentId: string | null;
  copyCount: number;
  viewCount: number;
  isDeleted: boolean;
  isPinned: boolean;
  lastVisitedAt: string | null;
  canvasX: number | null;
  canvasY: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionBlock {
  id: string;
  sessionId: string;
  type: BlockType;
  content: Record<string, unknown>;
  position: number;
  isEncrypted: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionWithBlocks extends Session {
  blocks: SessionBlock[];
  backlinks: { sessionId: string; title: string; emoji: string }[];
}

export interface SessionDashboardData {
  recentlyVisited: (Session & { preview: string })[];
  trending: (Session & { preview: string })[];
  pinned: (Session & { preview: string })[];
}

export interface PresenceEntry {
  userId: string | null;
  displayName: string;
  avatarColor: string;
  isEditing: boolean;
  lastSeen: number;
  showPublicProfile: boolean;
  viewerId: string;
}

// Block content shapes
export interface TextBlockContent {
  html: string;
  plainText: string;
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  caption: string;
}

export interface PasswordBlockContent {
  label: string;
  username: string;
  encryptedPassword: string;
  url: string;
  notes: string;
  encryptionIv?: string;
  encryptedUsername?: string;
}

export interface NoteBlockContent {
  title: string;
  body: string;
  color: string;
}

export interface CodeBlockContent {
  language: string;
  code: string;
}

export interface LinkBlockContent {
  url: string;
  title: string;
  description: string;
  favicon: string;
}

export interface DividerBlockContent {
  style: 'solid' | 'dashed' | 'gradient';
}

export interface SessionEmbedBlockContent {
  targetSessionId: string;
  targetTitle: string;
  preview: string;
}
