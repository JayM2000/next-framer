-- Item Expiry: Add expires_at column to vault_items for auto-deletion of anonymous items
ALTER TABLE vault_items
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for efficient cleanup of expired items
CREATE INDEX IF NOT EXISTS idx_vault_items_expires_at
  ON vault_items (expires_at)
  WHERE expires_at IS NOT NULL;
