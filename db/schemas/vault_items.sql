CREATE TABLE IF NOT EXISTS vault_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Item classification
    type                VARCHAR(20) NOT NULL CHECK (type IN ('password', 'note', 'clipboard')),
    visibility          VARCHAR(10) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),

    -- Core content
    title               VARCHAR(500) NOT NULL,
    content             TEXT NOT NULL DEFAULT '',
    plain_text          TEXT NOT NULL DEFAULT '',

    -- Password-specific fields (NULL for note/clipboard types)
    site_url            VARCHAR(2048),
    site_username       VARCHAR(500),
    encrypted_password  TEXT,

    -- Image support
    images_json         JSONB DEFAULT '[]'::jsonb,

    -- Soft delete
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id      ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_type          ON vault_items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_vault_items_visibility    ON vault_items(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_vault_items_not_deleted   ON vault_items(user_id, is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_vault_items_created       ON vault_items(user_id, created_at DESC);

-- Full-text search index on plain_text and title
CREATE INDEX IF NOT EXISTS idx_vault_items_search
    ON vault_items USING gin(to_tsvector('english', title || ' ' || plain_text));
