-- Session ↔ Tag many-to-many (reuses existing vault_tags table)
CREATE TABLE IF NOT EXISTS session_tags (
    session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
    tag_id      INT REFERENCES vault_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_session_tags_session ON session_tags(session_id);
CREATE INDEX IF NOT EXISTS idx_session_tags_tag     ON session_tags(tag_id);
