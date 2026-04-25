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
  toast: { message: string; visible: boolean };
  activeTab: 'dashboard' | 'vault' | 'create';
  activeCategory: 'all' | 'passwords' | 'notes' | 'clipboard' | 'private' | 'trash';
  drawerOpen: boolean;
  sidebarOpen: boolean;
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
  | { type: 'SET_SIDEBAR'; open: boolean };
