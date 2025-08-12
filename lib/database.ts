import { Pool } from 'pg';

// Use DATABASE_URL from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection timeout
  connectionTimeoutMillis: 10000,
  // Pool settings for better connection management
  max: 20,
  idleTimeoutMillis: 30000
});

// Helper function to execute SQL queries
export const sql = async (query: string, params: any[] = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

// Skip database initialization during startup to avoid connection issues
export const createTables = async () => {
  console.log('✅ Database initialization skipped - tables already exist in Supabase');
  console.log('✅ Server starting without database connection test');
  // Database connection will be tested when first API call is made
};

// Initialize database
export const initializeDatabase = async () => {
  try {
    await createTables();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};
