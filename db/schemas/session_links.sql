-- Session links (cross-references between sessions for backlinks)
CREATE TABLE IF NOT EXISTS session_links (
    source_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    target_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    PRIMARY KEY (source_session_id, target_session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_links_source ON session_links(source_session_id);
CREATE INDEX IF NOT EXISTS idx_session_links_target ON session_links(target_session_id);
