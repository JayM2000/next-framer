-- Real-time presence audit (use Upstash Redis for live; this is for audit)
CREATE TABLE IF NOT EXISTS session_presence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id         INT REFERENCES users(id) ON DELETE SET NULL,
    display_name    TEXT,
    is_editing      BOOLEAN DEFAULT false,
    last_seen       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_presence_session ON session_presence(session_id);
CREATE INDEX IF NOT EXISTS idx_session_presence_user    ON session_presence(user_id);
