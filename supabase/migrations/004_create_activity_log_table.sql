-- Create activity_log table for tracking user actions and system events
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- transaction, user, supplier, inventory, etc.
    entity_id INTEGER,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_shop_id ON activity_log(shop_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON activity_log TO anon;
GRANT ALL PRIVILEGES ON activity_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE activity_log_id_seq TO authenticated;