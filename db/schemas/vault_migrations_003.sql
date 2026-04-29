-- E2E Encryption: Add encryption columns to vault_items
ALTER TABLE vault_items
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_plain_text TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_username TEXT,
  ADD COLUMN IF NOT EXISTS encryption_iv TEXT;

-- Add encryption salt to user_settings (for PBKDF2 key derivation backup)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS encryption_salt TEXT;
