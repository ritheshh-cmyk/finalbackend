-- Create reports table for storing generated reports
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- sales, inventory, financial, custom
    description TEXT,
    parameters JSONB DEFAULT '{}'::jsonb, -- Report parameters like date range, filters
    data JSONB DEFAULT '{}'::jsonb, -- Cached report data
    file_path TEXT, -- Path to generated file (PDF, Excel, etc.)
    status TEXT DEFAULT 'pending', -- pending, generating, completed, failed
    generated_by INTEGER, -- User ID who generated the report
    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    shop_id TEXT DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_shop_id ON reports(shop_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_expires_at ON reports(expires_at);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON reports TO anon;
GRANT ALL PRIVILEGES ON reports TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reports_id_seq TO authenticated;

-- Insert some default report templates
INSERT INTO reports (name, type, description, parameters, status) VALUES
('Daily Sales Report', 'sales', 'Daily sales summary with transaction details', '{"period": "daily", "include_details": true}', 'completed'),
('Weekly Sales Report', 'sales', 'Weekly sales summary', '{"period": "weekly", "include_details": false}', 'completed'),
('Monthly Sales Report', 'sales', 'Monthly sales summary with trends', '{"period": "monthly", "include_trends": true}', 'completed'),
('Inventory Status Report', 'inventory', 'Current inventory levels and low stock alerts', '{"include_low_stock": true, "threshold": 10}', 'completed'),
('Supplier Payment Report', 'financial', 'Supplier payment history and outstanding amounts', '{"include_outstanding": true}', 'completed'),
('Profit Analysis Report', 'financial', 'Profit analysis by repair type and time period', '{"group_by": "repair_type", "period": "monthly"}', 'completed')
ON CONFLICT DO NOTHING;