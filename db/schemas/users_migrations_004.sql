-- Add missing UNIQUE constraint on clerk_id
-- The base schema defined clerk_id without UNIQUE, and migration_001's
-- ADD COLUMN IF NOT EXISTS was a no-op since the column already existed.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_clerk_id_key;
ALTER TABLE users ADD CONSTRAINT users_clerk_id_key UNIQUE (clerk_id);

-- Also make password nullable since Clerk-managed users don't have one
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password SET DEFAULT NULL;
