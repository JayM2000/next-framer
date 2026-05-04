'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { trpc } from '@/trpc/client';
import type { AppState, AppAction, VaultItem } from './types';
import { useSocket } from '@/components/providers/SocketProvider';
import { useAuth } from '@clerk/nextjs';

// ── LocalStorage key for anonymous user settings ──
const ANON_SETTINGS_KEY = 'vault_anon_settings';

function getAnonSettings(): { autoTagEnabled: boolean } {
  if (typeof window === 'undefined') return { autoTagEnabled: true };
  try {
    const raw = localStorage.getItem(ANON_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { autoTagEnabled: true };
}

function setAnonSettings(settings: { autoTagEnabled: boolean }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ANON_SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

// ── UI-only state (not persisted) ─────────────────────────

interface UIState {
  searchQuery: string;
  selectedTags: string[];
  toast: { message: string; visible: boolean; type: 'success' | 'error' | 'warning' };
  activeTab: 'dashboard' | 'vault' | 'create';
  activeCategory: 'all' | 'passwords' | 'notes' | 'clipboard' | 'private' | 'trash';
  drawerOpen: boolean;
  sidebarOpen: boolean;
}

type UIAction =
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_SELECTED_TAGS'; tags: string[] }
  | { type: 'SHOW_TOAST'; message: string; toastType?: 'success' | 'error' | 'warning' }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_TAB'; tab: UIState['activeTab'] }
  | { type: 'SET_DRAWER'; open: boolean }
  | { type: 'SET_CATEGORY'; category: UIState['activeCategory'] }
  | { type: 'SET_SIDEBAR'; open: boolean };

const initialUIState: UIState = {
  searchQuery: '',
  selectedTags: [],
  toast: { message: '', visible: false, type: 'success' },
  activeTab: 'dashboard',
  activeCategory: 'all',
  drawerOpen: false,
  sidebarOpen: false,
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'SET_SELECTED_TAGS':
      return { ...state, selectedTags: action.tags };
    case 'SHOW_TOAST':
      return { ...state, toast: { message: action.message, visible: true, type: action.toastType || 'success' } };
    case 'HIDE_TOAST':
      return { ...state, toast: { ...state.toast, visible: false } };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_DRAWER':
      return { ...state, drawerOpen: action.open };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.open };
    case 'SET_CATEGORY':
      return { ...state, activeCategory: action.category };
    default:
      return state;
  }
}

// ── Context type ──────────────────────────────────────────

interface VaultContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  copyToClipboard: (text: string, label?: string) => void;
  isLoading: boolean;
  isCreating: boolean;
  isRefetching: boolean;
  currentDbUserId: number | null;
  userSettings: { showProfileOnPublic: boolean; autoTagEnabled: boolean } | undefined;
  updateUserSettings: (showProfileOnPublic: boolean, autoTagEnabled: boolean) => void;
  // Infinite scroll pagination
  fetchNextPublicPage: () => void;
  hasNextPublicPage: boolean;
  isFetchingNextPublicPage: boolean;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────

export function VaultProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const [ui, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [anonAutoTag, setAnonAutoTag] = React.useState(() => getAnonSettings().autoTagEnabled);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const userSettingsRef = useRef<{ autoTagEnabled: boolean }>({ autoTagEnabled: true });

  // ── tRPC queries ──
  const utils = trpc.useUtils();

  const {
    data: userItems = [],
    isLoading: isLoadingUserItems,
    isFetching: isFetchingUserItems,
  } = trpc.vault.getItems.useQuery(undefined, {
    // Only fetch when user is likely logged in; will gracefully fail with UNAUTHORIZED
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: publicPagesData,
    isLoading: isLoadingPublic,
    isFetching: isFetchingPublic,
    fetchNextPage: fetchNextPublicPage,
    hasNextPage: hasNextPublicPage = false,
    isFetchingNextPage: isFetchingNextPublicPage,
  } = trpc.vault.getPublicItemsPaginated.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      refetchOnWindowFocus: true,
    }
  );

  // Flatten all pages into a single array
  const publicItems = useMemo(() => {
    if (!publicPagesData?.pages) return [];
    return publicPagesData.pages.flatMap((page) => page.items);
  }, [publicPagesData]);

  // ── Socket.IO Live Updates ──
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleVaultUpdate = () => {
      // Invalidate queries so they refetch immediately
      utils.vault.getPublicItemsPaginated.invalidate();
      utils.vault.getItems.invalidate();
      utils.vault.getUserSettings.invalidate();
    };

    socket.on('vault:update', handleVaultUpdate);

    return () => {
      socket.off('vault:update', handleVaultUpdate);
    };
  }, [socket, isConnected, utils]);

  // ── tRPC mutations ──
  // createItem is a public API — works both logged-in and anonymous
  const createMutation = trpc.vault.createItem.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  const updateMutation = trpc.vault.updateItem.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  const deleteMutation = trpc.vault.deleteItem.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  const toggleVisibilityMutation = trpc.vault.toggleVisibility.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  const toggleImportantMutation = trpc.vault.toggleImportant.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  const recoverMutation = trpc.vault.recoverItem.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  const deletePermanentMutation = trpc.vault.deleteItemPermanent.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  const incrementCopyCountMutation = trpc.vault.incrementCopyCount.useMutation({
    onSuccess: () => {
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  // ── Merge items: user's private items + public items (deduped) ──
  const items: VaultItem[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: VaultItem[] = [];

    // User items first (includes both public and private owned by user)
    for (const item of userItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item as VaultItem);
      }
    }

    // Add public items not already in user's list
    for (const item of publicItems) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item as VaultItem);
      }
    }

    return merged;
  }, [userItems, publicItems]);

  const finalItems = items;

  // ── Toast helpers ──
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    uiDispatch({ type: 'SHOW_TOAST', message, toastType: type });
    toastTimeout.current = setTimeout(() => uiDispatch({ type: 'HIDE_TOAST' }), 5000);
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, label = 'Copied to clipboard!') => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(label);
      } catch {
        showToast('Failed to copy');
      }
    },
    [showToast]
  );

  // ── Unified dispatch that routes data actions to tRPC ──
  const dispatch: React.Dispatch<AppAction> = useCallback(
    (action: AppAction) => {
      switch (action.type) {
        // ── Data mutations → tRPC ──
        case 'ADD_ITEM': {
          const item = action.item;
          
          const payload = {
            type: item.type,
            visibility: item.visibility,
            title: item.title,
            content: item.content,
            plainText: item.plainText,
            siteUrl: item.siteUrl,
            username: item.username,
            password: item.password,
            images: item.images,
            tags: item.tags?.map((t) => ({ label: t.label, color: t.color })),
            isImportant: item.isImportant,
            autoTagEnabled: userSettingsRef.current?.autoTagEnabled,
          };

          createMutation.mutate(payload, {
            onSuccess: () => action.onSuccess?.(),
            onError: (error) => {
              showToast(error.message || 'Failed to add item', 'error');
              action.onError?.(error);
            },
            onSettled: () => action.onSettled?.(),
          });
          break;
        }

        case 'UPDATE_ITEM': {
          const item = action.item;
          
          const payload = {
            id: item.id,
            type: item.type,
            visibility: item.visibility,
            title: item.title,
            content: item.content,
            plainText: item.plainText,
            siteUrl: item.siteUrl,
            username: item.username,
            password: item.password,
            images: item.images,
            tags: item.tags?.map((t) => ({ label: t.label, color: t.color })),
            isImportant: item.isImportant,
          };

          updateMutation.mutate(payload, {
            onSuccess: () => action.onSuccess?.(),
            onError: (error) => {
              showToast(error.message || 'Failed to update item', 'error');
              action.onError?.(error);
            },
            onSettled: () => action.onSettled?.(),
          });
          break;
        }

        case 'DELETE_ITEM':
          deleteMutation.mutate({ id: action.id }, {
            onSuccess: () => action.onSuccess?.(),
            onError: (error) => action.onError?.(error),
            onSettled: () => action.onSettled?.(),
          });
          break;

        case 'TOGGLE_VISIBILITY':
          toggleVisibilityMutation.mutate({ id: action.id }, {
            onSuccess: () => action.onSuccess?.(),
            onError: (error) => action.onError?.(error),
            onSettled: () => action.onSettled?.(),
          });
          break;

        case 'TOGGLE_IMPORTANT':
          toggleImportantMutation.mutate({ id: action.id }, {
            onSuccess: () => action.onSuccess?.(),
            onError: (error) => action.onError?.(error),
            onSettled: () => action.onSettled?.(),
          });
          break;

        case 'RECOVER_ITEM':
          recoverMutation.mutate({ id: action.id }, {
            onSuccess: () => action.onSuccess?.(),
            onError: (error) => action.onError?.(error),
            onSettled: () => action.onSettled?.(),
          });
          break;

        case 'DELETE_ITEM_PERMANENT':
          deletePermanentMutation.mutate({ id: action.id }, {
            onSuccess: () => action.onSuccess?.(),
            onError: (error) => action.onError?.(error),
            onSettled: () => action.onSettled?.(),
          });
          break;

        case 'INCREMENT_COPY_COUNT':
          incrementCopyCountMutation.mutate({ id: action.id });
          break;

        // ── UI-only actions → local reducer ──
        case 'SET_SEARCH':
          uiDispatch(action);
          break;
        case 'SET_SELECTED_TAGS':
          uiDispatch(action);
          break;
        case 'SHOW_TOAST':
          uiDispatch(action);
          break;
        case 'HIDE_TOAST':
          uiDispatch(action);
          break;
        case 'SET_TAB':
          uiDispatch(action);
          break;
        case 'SET_DRAWER':
          uiDispatch(action);
          break;
        case 'SET_SIDEBAR':
          uiDispatch(action);
          break;
        case 'SET_CATEGORY':
          uiDispatch(action);
          break;

        // LOGIN/LOGOUT handled by Clerk, not local state
        case 'LOGIN':
        case 'LOGOUT':
          break;
      }
    },
    [
      createMutation,
      updateMutation,
      deleteMutation,
      toggleVisibilityMutation,
      toggleImportantMutation,
      recoverMutation,
      deletePermanentMutation,
      incrementCopyCountMutation,
      showToast,
    ]
  );

  // ── Compose the full AppState shape ──
  const state: AppState = useMemo(
    () => ({
      auth: { isLoggedIn: false, username: null }, // Clerk handles auth, not used by components
      items: finalItems,
      searchQuery: ui.searchQuery,
      selectedTags: ui.selectedTags,
      toast: ui.toast,
      activeTab: ui.activeTab,
      activeCategory: ui.activeCategory,
      drawerOpen: ui.drawerOpen,
      sidebarOpen: ui.sidebarOpen,
    }),
    [finalItems, ui]
  );

  const isLoading = isLoadingUserItems || isLoadingPublic;
  const isCreating = createMutation.isPending;
  const isRefetching = (isFetchingUserItems && !isLoadingUserItems) || (isFetchingPublic && !isLoadingPublic);

  // Derive the current user's DB id from their items
  // Gate on isSignedIn so auth-dependent UI reacts instantly on sign-out
  const currentDbUserId: number | null = useMemo(() => {
    if (!isSignedIn) return null;
    if (userItems.length > 0) {
      const first = userItems[0] as VaultItem;
      return first.userId ?? null;
    }
    return null;
  }, [isSignedIn, userItems]);

  // ── User settings (profile visibility toggle) ──
  // Only query API when user is signed in to avoid UNAUTHORIZED errors
  const { data: apiUserSettings } = trpc.vault.getUserSettings.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!isSignedIn,
  });

  const updateSettingsMutation = trpc.vault.updateUserSettings.useMutation({
    onSuccess: () => {
      utils.vault.getUserSettings.invalidate();
      utils.vault.getPublicItemsPaginated.invalidate();
    },
  });

  // Strict separation: API-only when signed in, localStorage-only when anonymous
  const userSettings = useMemo(() => {
    if (isSignedIn) {
      // Logged in → always from API (default while loading, never touch localStorage)
      return apiUserSettings ?? { showProfileOnPublic: false, autoTagEnabled: true };
    }
    // Anonymous → always from localStorage
    return { showProfileOnPublic: false, autoTagEnabled: anonAutoTag };
  }, [isSignedIn, apiUserSettings, anonAutoTag]);

  // Keep ref in sync so dispatch (defined earlier) can read the latest value
  userSettingsRef.current = userSettings;

  const updateUserSettings = useCallback(
    (showProfileOnPublic: boolean, autoTagEnabled: boolean) => {
      if (isSignedIn) {
        // Logged in → persist to DB via API
        updateSettingsMutation.mutate(
          { showProfileOnPublic, autoTagEnabled },
          {
            onSuccess: () => showToast('Settings saved successfully'),
            onError: (err) => showToast(err.message || 'Failed to save settings', 'error'),
          }
        );
      } else {
        // Anonymous → persist to localStorage
        try {
          setAnonAutoTag(autoTagEnabled);
          setAnonSettings({ autoTagEnabled });
          showToast('Settings saved locally');
        } catch {
          showToast('Failed to save settings locally', 'error');
        }
      }
    },
    [isSignedIn, updateSettingsMutation, showToast]
  );

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      showToast,
      copyToClipboard,
      isLoading,
      isCreating,
      isRefetching,
      currentDbUserId,
      userSettings,
      updateUserSettings,
      fetchNextPublicPage: () => { if (hasNextPublicPage) fetchNextPublicPage(); },
      hasNextPublicPage,
      isFetchingNextPublicPage,
    }),
    [
      state,
      dispatch,
      showToast,
      copyToClipboard,
      isLoading,
      isCreating,
      isRefetching,
      currentDbUserId,
      userSettings,
      updateUserSettings,
      fetchNextPublicPage,
      hasNextPublicPage,
      isFetchingNextPublicPage,
    ]
  );

  return (
    <VaultContext.Provider value={contextValue}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}
