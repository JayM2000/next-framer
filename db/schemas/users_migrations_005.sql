-- User settings / preferences table
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    show_profile_on_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
