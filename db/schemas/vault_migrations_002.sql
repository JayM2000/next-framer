-- Migration 002: Track copy count per item for popularity sorting on public board
-- When a user copies content from a public card, copy_count increments.
-- Public board items are sorted by copy_count DESC so most-copied items appear first.

ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS copy_count INT NOT NULL DEFAULT 0;

-- Index for efficient sorting of public items by popularity
CREATE INDEX IF NOT EXISTS idx_vault_items_copy_count
    ON vault_items(copy_count DESC)
    WHERE visibility = 'public' AND is_deleted = FALSE;
