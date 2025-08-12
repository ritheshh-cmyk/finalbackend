-- Create settings table for user and system settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    setting_type TEXT NOT NULL DEFAULT 'user', -- user, system, shop
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, setting_key, shop_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_type ON settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_settings_shop_id ON settings(shop_id);
CREATE INDEX IF NOT EXISTS idx_settings_is_public ON settings(is_public);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON settings TO anon;
GRANT ALL PRIVILEGES ON settings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE settings_id_seq TO authenticated;

-- Insert default system settings
INSERT INTO settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('app_name', '"Mobile Repair Tracker"', 'system', 'Application name', true),
('currency', '"USD"', 'system', 'Default currency', true),
('tax_rate', '0.08', 'system', 'Default tax rate', true),
('business_hours', '{"open": "09:00", "close": "18:00"}', 'system', 'Business operating hours', true),
('contact_info', '{"phone": "", "email": "", "address": ""}', 'system', 'Business contact information', true)
ON CONFLICT (user_id, setting_key, shop_id) DO NOTHING;