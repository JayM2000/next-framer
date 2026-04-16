-- Migration 001: Make user_id nullable to support anonymous (public) item creation
-- Anonymous items have user_id = NULL and are always public

-- 1. Allow NULL user_id on vault_items
ALTER TABLE vault_items ALTER COLUMN user_id DROP NOT NULL;

-- 2. Allow NULL user_id on vault_tags (for anonymous tags)
ALTER TABLE vault_tags ALTER COLUMN user_id DROP NOT NULL;

-- 3. Drop the old unique constraint on vault_tags and recreate to handle NULLs
--    PostgreSQL treats NULLs as distinct in UNIQUE constraints, so we need a partial unique index
ALTER TABLE vault_tags DROP CONSTRAINT IF EXISTS vault_tags_user_id_label_key;

-- Unique tag per logged-in user
CREATE UNIQUE INDEX IF NOT EXISTS uq_vault_tags_user_label
    ON vault_tags(user_id, label) WHERE user_id IS NOT NULL;

-- Unique tag for anonymous users (user_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_vault_tags_anon_label
    ON vault_tags(label) WHERE user_id IS NULL;

-- 4. Index for querying anonymous public items efficiently
CREATE INDEX IF NOT EXISTS idx_vault_items_anon_public
    ON vault_items(visibility, is_deleted)
    WHERE user_id IS NULL AND is_deleted = FALSE;
