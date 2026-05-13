-- Content Encryption Toggle: opt-in encryption for public item content
-- Separate from is_encrypted (which encrypts everything for private items).
-- is_content_encrypted only encrypts description/content while keeping title, tags visible.
ALTER TABLE vault_items
  ADD COLUMN IF NOT EXISTS is_content_encrypted BOOLEAN NOT NULL DEFAULT FALSE;
