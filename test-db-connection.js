require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    const client = await pool.connect();
    console.log('Connected successfully!');
    
    // Test query to list users
    const result = await client.query('SELECT username, role, shop_id FROM users LIMIT 10');
    console.log('Users found:', result.rows.length);
    console.log('Users:', result.rows);
    
    // Check if admin user exists
    const adminResult = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    console.log('Admin user exists:', adminResult.rows.length > 0);
    if (adminResult.rows.length > 0) {
      console.log('Admin user:', adminResult.rows[0]);
    }
    
    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await pool.end();
  }
}

testConnection();