# Goal Description

The goal is to add a sticky Left Sidebar to the application to provide clear navigation for all the website features. This will give users a centralized place to trigger actions like "New Item" and switch between different views (Dashboard, Private Vault, Passwords, Secure Notes, Settings, etc.).

## Proposed Changes

We will transition the App from a 2-column or full-width view to a 3-column architecture on desktop (Left Sidebar -> Main Content -> Right Panel / Private Vault). Mobile layout will remain tab-based but potentially can include a sliding drawer version of the sidebar if needed (or keep the current Mobile Nav).

### Data Store Updates
- Update the application state to track current active view/category.

#### [MODIFY] [types.ts](file:///c:/Users/misal/OneDrive/Documents/next-framer/lib/vault/types.ts)
- Add `activeCategory: 'all' | 'passwords' | 'notes' | 'clipboard' | 'private' | 'trash'` to `AppState`.
- Add `SET_CATEGORY` to `AppAction`.

#### [MODIFY] [store.tsx](file:///c:/Users/misal/OneDrive/Documents/next-framer/lib/vault/store.tsx)
- Add `activeCategory: 'all'` to default state.
- Add reducer handling for `SET_CATEGORY`.

### Component Changes

#### [NEW] [MainSidebar.tsx](file:///c:/Users/misal/OneDrive/Documents/next-framer/components/vault/MainSidebar.tsx)
- Create a new sticky sidebar containing navigation groups:
  - **Quick Actions:** New Item
  - **Main Menu:** Dashboard (All), Private Vault
  - **Categories:** Passwords, Secure Notes, Clipboard Snippets
  - **System:** Settings, Trash

#### [MODIFY] [VaultApp.tsx](file:///c:/Users/misal/OneDrive/Documents/next-framer/components/vault/VaultApp.tsx)
- Change the main screen layout to include the new `MainSidebar` on the left side.
- Using `flex` with a `w-64` fixed sidebar on large screens, and rendering `Dashboard` in the remaining flexible space.

#### [MODIFY] [Header.tsx](file:///c:/Users/misal/OneDrive/Documents/next-framer/components/vault/Header.tsx)
- Potentially tweak padding or align the Logo with the sidebar.

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/misal/OneDrive/Documents/next-framer/components/vault/Dashboard.tsx) & [PublicBoard.tsx](file:///c:/Users/misal/OneDrive/Documents/next-framer/components/vault/PublicBoard.tsx)
- Filter items displayed in `PublicBoard` based on the newly introduced `activeCategory`.
- `Dashboard` will continue displaying the Right Panel (`VaultSidebar`), creating a full 3-column experience.

## Open Questions

> [!IMPORTANT]
> - Should "Private Vault" in the new sidebar simply shift focus to the existing right-hand side panel, or should it change the main board view to only show private items? 
> - For filtering by "Passwords/Notes/Clipboard", do you want to show these in the main `PublicBoard` list? Are there any other custom categories you'd like added?

## Verification Plan

### Manual Verification
- Test clicking "New Item" from the Sidebar to ensure the modal opens.
- Test clicking different categories (Passwords, Secure Notes) and ensure the main list updates.
- Verify UI scales down correctly on smaller screens.
