-- Drop existing tables that don't match our schema
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS recurring_transactions CASCADE;
DROP TABLE IF EXISTS expenditures CASCADE;
DROP TABLE IF EXISTS supplier_payments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS file_uploads CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table for mobile repair shop
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'worker',
    shop_id TEXT DEFAULT 'default'
);

-- Create suppliers table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_number VARCHAR(20),
    address TEXT,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create inventory_items table
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    part_name TEXT NOT NULL,
    part_type TEXT NOT NULL,
    compatible_devices TEXT,
    cost DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    supplier TEXT NOT NULL,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create transactions table for mobile repairs
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    device_model TEXT NOT NULL,
    repair_type TEXT NOT NULL,
    repair_cost DECIMAL(10, 2) NOT NULL,
    actual_cost DECIMAL(10, 2),
    profit DECIMAL(10, 2),
    amount_given DECIMAL(10, 2) NOT NULL,
    change_returned DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    external_store_name TEXT,
    external_item_name TEXT,
    external_item_cost DECIMAL(10, 2),
    internal_cost DECIMAL(10, 2),
    free_glass_installation BOOLEAN NOT NULL,
    remarks TEXT,
    status TEXT NOT NULL,
    requires_inventory BOOLEAN NOT NULL,
    supplier_name TEXT,
    parts_cost DECIMAL(10, 2),
    custom_supplier_name TEXT,
    external_purchases TEXT,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create purchase_orders table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    shop_id TEXT DEFAULT 'default',
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    received_date TIMESTAMP WITH TIME ZONE
);

-- Create supplier_payments table
CREATE TABLE supplier_payments (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER REFERENCES suppliers(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    description TEXT,
    shop_id TEXT DEFAULT 'default',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create expenditures table
CREATE TABLE expenditures (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    recipient TEXT,
    items TEXT,
    paid_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    remaining_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create grouped_expenditures table
CREATE TABLE grouped_expenditures (
    id SERIAL PRIMARY KEY,
    provider_name TEXT NOT NULL,
    category TEXT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create grouped_expenditure_payments table
CREATE TABLE grouped_expenditure_payments (
    id SERIAL PRIMARY KEY,
    grouped_expenditure_id INTEGER REFERENCES grouped_expenditures(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    description TEXT,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_shop_id ON transactions(shop_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_inventory_items_shop_id ON inventory_items(shop_id);
CREATE INDEX idx_suppliers_shop_id ON suppliers(shop_id);
CREATE INDEX idx_expenditures_shop_id ON expenditures(shop_id);
CREATE INDEX idx_purchase_orders_shop_id ON purchase_orders(shop_id);
CREATE INDEX idx_supplier_payments_shop_id ON supplier_payments(shop_id);

-- Insert default admin user
INSERT INTO users (username, password, role, shop_id) 
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'default')
ON CONFLICT (username) DO NOTHING;

-- Insert some default categories for expenditures
INSERT INTO suppliers (name, contact_number, address, shop_id) 
VALUES 
    ('Default Supplier', '1234567890', 'Default Address', 'default'),
    ('Parts Supplier', '0987654321', 'Parts Address', 'default')
ON CONFLICT DO NOTHING;