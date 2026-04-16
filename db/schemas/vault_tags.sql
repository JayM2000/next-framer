CREATE TABLE IF NOT EXISTS vault_tags (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(100) NOT NULL,
    color       VARCHAR(7) NOT NULL DEFAULT '#8b5cf6',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Each user can only have one tag with a given label
    UNIQUE(user_id, label)
);

CREATE INDEX IF NOT EXISTS idx_vault_tags_user_id ON vault_tags(user_id);
