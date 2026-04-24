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

// ── UI-only state (not persisted) ─────────────────────────

interface UIState {
  searchQuery: string;
  selectedTags: string[];
  toast: { message: string; visible: boolean };
  activeTab: 'dashboard' | 'vault' | 'create';
  activeCategory: 'all' | 'passwords' | 'notes' | 'clipboard' | 'private' | 'trash';
  drawerOpen: boolean;
  sidebarOpen: boolean;
}

type UIAction =
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_SELECTED_TAGS'; tags: string[] }
  | { type: 'SHOW_TOAST'; message: string }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_TAB'; tab: UIState['activeTab'] }
  | { type: 'SET_DRAWER'; open: boolean }
  | { type: 'SET_CATEGORY'; category: UIState['activeCategory'] }
  | { type: 'SET_SIDEBAR'; open: boolean };

const initialUIState: UIState = {
  searchQuery: '',
  selectedTags: [],
  toast: { message: '', visible: false },
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
      return { ...state, toast: { message: action.message, visible: true } };
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
  showToast: (message: string) => void;
  copyToClipboard: (text: string, label?: string) => void;
  isLoading: boolean;
  isCreating: boolean;
  isRefetching: boolean;
  currentDbUserId: number | null;
  userSettings: { showProfileOnPublic: boolean; autoTagEnabled: boolean } | undefined;
  updateUserSettings: (showProfileOnPublic: boolean, autoTagEnabled: boolean) => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────

export function VaultProvider({ children }: { children: ReactNode }) {
  const [ui, uiDispatch] = useReducer(uiReducer, initialUIState);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    data: publicItems = [],
    isLoading: isLoadingPublic,
    isFetching: isFetchingPublic,
  } = trpc.vault.getPublicItems.useQuery(undefined, {
    refetchOnWindowFocus: true, // Also refetch when they switch tabs
  });

  // ── Socket.IO Live Updates ──
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleVaultUpdate = () => {
      // Invalidate queries so they refetch immediately
      utils.vault.getPublicItems.invalidate();
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
      utils.vault.getPublicItems.invalidate();
    },
  });

  const updateMutation = trpc.vault.updateItem.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItems.invalidate();
    },
  });

  const deleteMutation = trpc.vault.deleteItem.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItems.invalidate();
    },
  });

  const toggleVisibilityMutation = trpc.vault.toggleVisibility.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItems.invalidate();
    },
  });

  const recoverMutation = trpc.vault.recoverItem.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItems.invalidate();
    },
  });

  const deletePermanentMutation = trpc.vault.deleteItemPermanent.useMutation({
    onSuccess: () => {
      utils.vault.getItems.invalidate();
      utils.vault.getPublicItems.invalidate();
    },
  });

  const incrementCopyCountMutation = trpc.vault.incrementCopyCount.useMutation({
    onSuccess: () => {
      utils.vault.getPublicItems.invalidate();
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

  // ── Toast helpers ──
  const showToast = useCallback((message: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    uiDispatch({ type: 'SHOW_TOAST', message });
    toastTimeout.current = setTimeout(() => uiDispatch({ type: 'HIDE_TOAST' }), 2500);
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
          createMutation.mutate(
            {
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
            },
            {
              onSuccess: () => action.onSuccess?.(),
              onError: (error) => action.onError?.(error),
              onSettled: () => action.onSettled?.(),
            }
          );
          break;
        }

        case 'UPDATE_ITEM': {
          const item = action.item;
          updateMutation.mutate(
            {
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
            },
            {
              onSuccess: () => action.onSuccess?.(),
              onError: (error) => action.onError?.(error),
              onSettled: () => action.onSettled?.(),
            }
          );
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
    [createMutation, updateMutation, deleteMutation, toggleVisibilityMutation, recoverMutation, deletePermanentMutation, incrementCopyCountMutation]
  );

  // ── Compose the full AppState shape ──
  const state: AppState = useMemo(
    () => ({
      auth: { isLoggedIn: false, username: null }, // Clerk handles auth, not used by components
      items,
      searchQuery: ui.searchQuery,
      selectedTags: ui.selectedTags,
      toast: ui.toast,
      activeTab: ui.activeTab,
      activeCategory: ui.activeCategory,
      drawerOpen: ui.drawerOpen,
      sidebarOpen: ui.sidebarOpen,
    }),
    [items, ui]
  );

  const isLoading = isLoadingUserItems || isLoadingPublic;
  const isCreating = createMutation.isPending;
  const isRefetching = (isFetchingUserItems && !isLoadingUserItems) || (isFetchingPublic && !isLoadingPublic);

  // Derive the current user's DB id from their items
  const currentDbUserId: number | null = useMemo(() => {
    if (userItems.length > 0) {
      const first = userItems[0] as VaultItem;
      return first.userId ?? null;
    }
    return null;
  }, [userItems]);

  // ── User settings (profile visibility toggle) ──
  const { data: userSettings } = trpc.vault.getUserSettings.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const updateSettingsMutation = trpc.vault.updateUserSettings.useMutation({
    onSuccess: () => {
      utils.vault.getUserSettings.invalidate();
      utils.vault.getPublicItems.invalidate();
    },
  });

  const updateUserSettings = useCallback(
    (showProfileOnPublic: boolean, autoTagEnabled: boolean) => {
      updateSettingsMutation.mutate({ showProfileOnPublic, autoTagEnabled });
    },
    [updateSettingsMutation]
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
