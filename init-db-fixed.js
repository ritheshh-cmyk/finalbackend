// Initialize database with users - Fixed version
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres.pxvtfywumekpdtablcjq:finalone123@aws-0-us-west-1.pooler.supabase.com:6543/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔧 Initializing database with correct connection...');

        // Test connection first
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful:', testResult.rows[0].now);

        // Check if users table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
            )
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('📋 Creating users table...');
            await pool.query(`
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'worker',
                    shop_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }

        // Create default users
        const users = [
            { username: 'admin', password: 'lucky@777', role: 'admin' },
            { username: 'owner', password: 'owner@123', role: 'owner' },
            { username: 'worker', password: 'worker@123', role: 'worker' }
        ];

        for (const user of users) {
            // Check if user exists
            const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
            
            if (existingUser.rows.length === 0) {
                console.log(`➕ Creating user: ${user.username}`);
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.query(
                    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
                    [user.username, hashedPassword, user.role]
                );
            } else {
                console.log(`✅ User ${user.username} already exists`);
                // Update password to make sure it's correct
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.query(
                    'UPDATE users SET password = $1 WHERE username = $2',
                    [hashedPassword, user.username]
                );
                console.log(`🔧 Updated password for ${user.username}`);
            }
        }

        console.log('🎉 Database initialization completed successfully!');
        await pool.end();

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

initializeDatabase();
