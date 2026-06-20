-- Migration 006: Convert existing vault_items → sessions + session_blocks
-- Each existing item becomes a session with a single text block containing its content.
-- Tags are migrated to session_tags. Encrypted items carry encryption flags forward.

DO $$
DECLARE
    item RECORD;
    new_session_id UUID;
    block_content JSONB;
    pos INT := 0;
BEGIN
    -- Only run if sessions table is empty (idempotent)
    IF EXISTS (SELECT 1 FROM sessions LIMIT 1) THEN
        RAISE NOTICE 'Sessions table already has data — skipping migration.';
        RETURN;
    END IF;

    FOR item IN
        SELECT vi.*, 
               vi.encrypted_password,
               vi.is_encrypted,
               vi.is_content_encrypted,
               vi.encrypted_content,
               vi.encrypted_plain_text,
               vi.encrypted_username,
               vi.encryption_iv
        FROM vault_items vi
        ORDER BY vi.created_at ASC
    LOOP
        new_session_id := gen_random_uuid();

        -- Create session from item
        INSERT INTO sessions (
            id, title, emoji, owner_id, is_public, is_encrypted,
            copy_count, view_count, is_deleted, position,
            created_at, updated_at
        ) VALUES (
            new_session_id,
            item.title,
            CASE item.type
                WHEN 'password' THEN '🔑'
                WHEN 'note' THEN '📝'
                WHEN 'clipboard' THEN '📎'
                ELSE '📄'
            END,
            item.user_id,
            item.visibility = 'public',
            item.is_encrypted,
            item.copy_count,
            0,
            item.is_deleted,
            pos,
            item.created_at,
            item.updated_at
        );

        -- Create a single block for the item content
        IF item.type = 'password' THEN
            block_content := jsonb_build_object(
                'label', item.title,
                'username', COALESCE(item.site_username, ''),
                'encryptedPassword', COALESCE(item.encrypted_password, ''),
                'url', COALESCE(item.site_url, ''),
                'notes', ''
            );
            INSERT INTO session_blocks (session_id, type, content, position, is_encrypted, created_by)
            VALUES (new_session_id, 'password', block_content, 0, item.is_encrypted, item.user_id);
        ELSE
            block_content := jsonb_build_object(
                'html', item.content,
                'plainText', item.plain_text
            );
            INSERT INTO session_blocks (session_id, type, content, position, is_encrypted, created_by)
            VALUES (new_session_id, 'text', block_content, 0, item.is_encrypted, item.user_id);
        END IF;

        -- Migrate image blocks if present
        IF item.images_json IS NOT NULL AND jsonb_array_length(item.images_json) > 0 THEN
            DECLARE
                img TEXT;
                img_pos INT := 1;
            BEGIN
                FOR img IN SELECT jsonb_array_elements_text(item.images_json)
                LOOP
                    INSERT INTO session_blocks (session_id, type, content, position, created_by)
                    VALUES (
                        new_session_id, 'image',
                        jsonb_build_object('url', img, 'alt', '', 'caption', ''),
                        img_pos, item.user_id
                    );
                    img_pos := img_pos + 1;
                END LOOP;
            END;
        END IF;

        -- Migrate tags: vault_item_tags → session_tags
        INSERT INTO session_tags (session_id, tag_id)
        SELECT new_session_id, vit.tag_id
        FROM vault_item_tags vit
        WHERE vit.item_id = item.id;

        pos := pos + 1;
    END LOOP;

    RAISE NOTICE 'Migration complete: % items converted to sessions.', pos;
END $$;
