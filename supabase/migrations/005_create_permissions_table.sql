-- Create permissions table for role-based access control
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    resource TEXT NOT NULL, -- transactions, users, suppliers, inventory, etc.
    action TEXT NOT NULL, -- create, read, update, delete, manage
    allowed BOOLEAN DEFAULT TRUE,
    conditions JSONB DEFAULT '{}'::jsonb, -- Additional conditions for permission
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(role, resource, action, shop_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_shop_id ON permissions(shop_id);
CREATE INDEX IF NOT EXISTS idx_permissions_allowed ON permissions(allowed);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON permissions TO anon;
GRANT ALL PRIVILEGES ON permissions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE permissions_id_seq TO authenticated;

-- Insert default permissions for different roles
INSERT INTO permissions (role, resource, action, allowed) VALUES
-- Admin permissions (full access)
('admin', 'transactions', 'create', true),
('admin', 'transactions', 'read', true),
('admin', 'transactions', 'update', true),
('admin', 'transactions', 'delete', true),
('admin', 'users', 'create', true),
('admin', 'users', 'read', true),
('admin', 'users', 'update', true),
('admin', 'users', 'delete', true),
('admin', 'suppliers', 'create', true),
('admin', 'suppliers', 'read', true),
('admin', 'suppliers', 'update', true),
('admin', 'suppliers', 'delete', true),
('admin', 'inventory', 'create', true),
('admin', 'inventory', 'read', true),
('admin', 'inventory', 'update', true),
('admin', 'inventory', 'delete', true),
('admin', 'bills', 'create', true),
('admin', 'bills', 'read', true),
('admin', 'bills', 'update', true),
('admin', 'bills', 'delete', true),
('admin', 'reports', 'read', true),
('admin', 'settings', 'read', true),
('admin', 'settings', 'update', true),
-- Owner permissions (same as admin)
('owner', 'transactions', 'create', true),
('owner', 'transactions', 'read', true),
('owner', 'transactions', 'update', true),
('owner', 'transactions', 'delete', true),
('owner', 'users', 'create', true),
('owner', 'users', 'read', true),
('owner', 'users', 'update', true),
('owner', 'users', 'delete', true),
('owner', 'suppliers', 'create', true),
('owner', 'suppliers', 'read', true),
('owner', 'suppliers', 'update', true),
('owner', 'suppliers', 'delete', true),
('owner', 'inventory', 'create', true),
('owner', 'inventory', 'read', true),
('owner', 'inventory', 'update', true),
('owner', 'inventory', 'delete', true),
('owner', 'bills', 'create', true),
('owner', 'bills', 'read', true),
('owner', 'bills', 'update', true),
('owner', 'bills', 'delete', true),
('owner', 'reports', 'read', true),
('owner', 'settings', 'read', true),
('owner', 'settings', 'update', true),
-- Worker permissions (limited access)
('worker', 'transactions', 'create', true),
('worker', 'transactions', 'read', true),
('worker', 'transactions', 'update', true),
('worker', 'transactions', 'delete', false),
('worker', 'users', 'create', false),
('worker', 'users', 'read', false),
('worker', 'users', 'update', false),
('worker', 'users', 'delete', false),
('worker', 'suppliers', 'create', false),
('worker', 'suppliers', 'read', true),
('worker', 'suppliers', 'update', false),
('worker', 'suppliers', 'delete', false),
('worker', 'inventory', 'create', false),
('worker', 'inventory', 'read', true),
('worker', 'inventory', 'update', false),
('worker', 'inventory', 'delete', false),
('worker', 'bills', 'create', true),
('worker', 'bills', 'read', true),
('worker', 'bills', 'update', true),
('worker', 'bills', 'delete', false),
('worker', 'reports', 'read', true),
('worker', 'settings', 'read', true),
('worker', 'settings', 'update', false)
ON CONFLICT (role, resource, action, shop_id) DO NOTHING;