const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function initializeDatabase() {
    console.log('🔧 Initializing database with correct setup...');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres.pxvtfywumekpdtablcjq:finalone123@aws-0-us-west-1.pooler.supabase.com:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Test connection first
        console.log('🔍 Testing database connection...');
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful:', testResult.rows[0].now);

        // Create users table if it doesn't exist
        console.log('📋 Creating users table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'worker',
                shop_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create default users with proper password hashes
        const users = [
            { username: 'admin', password: 'lucky@777', role: 'admin' },
            { username: 'owner', password: 'owner@123', role: 'owner' },
            { username: 'worker', password: 'worker@123', role: 'worker' }
        ];

        for (const user of users) {
            console.log(`👤 Creating user: ${user.username}`);
            
            // Check if user exists
            const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
            
            if (existingUser.rows.length === 0) {
                // Hash the password
                const hashedPassword = await bcrypt.hash(user.password, 10);
                
                // Insert the user
                await pool.query(
                    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
                    [user.username, hashedPassword, user.role]
                );
                console.log(`✅ Created user: ${user.username}`);
            } else {
                console.log(`ℹ️ User already exists: ${user.username}`);
            }
        }

        // Verify users were created
        console.log('\n📊 Current users in database:');
        const allUsers = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id');
        allUsers.rows.forEach(user => {
            console.log(`  - ${user.username} (${user.role}) - ID: ${user.id}`);
        });

        await pool.end();
        console.log('🎉 Database initialization completed successfully!');
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };
