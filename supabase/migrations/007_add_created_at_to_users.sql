-- Add created_at column to users table
ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing users to have a created_at timestamp
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;

-- Make created_at NOT NULL
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_users_created_at ON users(created_at);