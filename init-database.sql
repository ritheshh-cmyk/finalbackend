-- Ensure the database is set up correctly
-- Run this to create the users table if it doesn't exist

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'worker',
  shop_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users if they don't exist
INSERT INTO users (username, password, role) 
SELECT 'admin', '$2a$10$zKgWgvJ5vJ5qy5ZY5Y5Y5u5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5O', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

INSERT INTO users (username, password, role)
SELECT 'owner', '$2a$10$zKgWgvJ5vJ5qy5ZY5Y5Y5u5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5O', 'owner'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'owner');

INSERT INTO users (username, password, role)
SELECT 'worker', '$2a$10$zKgWgvJ5vJ5qy5ZY5Y5Y5u5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5O', 'worker'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'worker');
