-- Migration: Add canvas position columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS canvas_x DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS canvas_y DOUBLE PRECISION DEFAULT NULL;
