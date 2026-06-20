-- Blocks inside a session (the canvas editor content)
CREATE TABLE IF NOT EXISTS session_blocks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN ('text', 'image', 'password', 'note', 'divider', 'code', 'link', 'session-embed')),
    content         JSONB NOT NULL DEFAULT '{}',
    position        INTEGER NOT NULL DEFAULT 0,
    is_encrypted    BOOLEAN DEFAULT false,
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_session_blocks_session    ON session_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_blocks_position   ON session_blocks(session_id, position);
CREATE INDEX IF NOT EXISTS idx_session_blocks_type       ON session_blocks(session_id, type);
