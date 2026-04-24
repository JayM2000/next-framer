-- Add auto_tag_enabled setting for automatic tag generation
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS auto_tag_enabled BOOLEAN NOT NULL DEFAULT TRUE;
