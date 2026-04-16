CREATE TABLE IF NOT EXISTS vault_item_tags (
    item_id     UUID NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
    tag_id      INT  NOT NULL REFERENCES vault_tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_item_tags_item ON vault_item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_vault_item_tags_tag  ON vault_item_tags(tag_id);
