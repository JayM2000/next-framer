CREATE TABLE vehicle_parts (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(50) NOT NULL UNIQUE,
    part_name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    compatible_vehicles TEXT,
    description TEXT,
    price NUMERIC(10,2),
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    video_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,

    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);