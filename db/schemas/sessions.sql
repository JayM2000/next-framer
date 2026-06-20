-- Sessions (replaces the old "items/cards" concept as the top-level container)
CREATE TABLE IF NOT EXISTS sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL DEFAULT 'Untitled Session',
    emoji           TEXT DEFAULT '📄',
    owner_id        INT REFERENCES users(id) ON DELETE SET NULL,
    is_public       BOOLEAN DEFAULT false,
    is_encrypted    BOOLEAN DEFAULT false,
    encrypted_key   TEXT,
    tags            TEXT[] DEFAULT '{}',
    position        INTEGER DEFAULT 0,
    parent_id       UUID REFERENCES sessions(id) ON DELETE CASCADE,
    copy_count      INTEGER DEFAULT 0,
    view_count      INTEGER DEFAULT 0,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    last_visited_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_owner       ON sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_public      ON sessions(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_parent      ON sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_position    ON sessions(owner_id, position);
CREATE INDEX IF NOT EXISTS idx_sessions_not_deleted ON sessions(owner_id, is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sessions_trending    ON sessions(view_count DESC, copy_count DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_visited     ON sessions(owner_id, last_visited_at DESC NULLS LAST);

-- Full-text search on title
CREATE INDEX IF NOT EXISTS idx_sessions_title_search
    ON sessions USING gin(to_tsvector('english', title));
