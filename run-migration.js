require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connect directly to PostgreSQL database
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        console.log('🚀 Running database migration...');
        console.log('🔗 Connecting to PostgreSQL database...');
        
        await client.connect();
        console.log('✅ Connected to database');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'supabase/migrations/001_create_user_profiles.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Migration SQL loaded from:', migrationPath);
        
        // Execute the entire migration as one transaction
        console.log('⚡ Executing migration...');
        
        await client.query('BEGIN');
        
        try {
            await client.query(migrationSQL);
            await client.query('COMMIT');
            console.log('✅ Migration executed successfully');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        
        console.log('\n🎉 Migration completed!');
        
        // Verify the table was created
        console.log('\n🔍 Verifying user_profiles table...');
        const result = await client.query('SELECT COUNT(*) FROM public.user_profiles');
        console.log('✅ user_profiles table is accessible, current count:', result.rows[0].count);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
