import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

// Validate critical environment variables
function validateEnvironment(): void {
  const required = [
    'DATABASE_URL',
    'SUPABASE_URL', 
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

// Validate environment on startup
validateEnvironment();

// Create PostgreSQL connection pool with production SSL configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Accept self-signed certificates in production
    ca: process.env.DATABASE_CA_CERT || undefined
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used this many times
});

// Test database connection on startup
async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW() as current_time');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database connection test
testDatabaseConnection();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Graceful shutdown...');
  pool.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Graceful shutdown...');
  pool.end();
  process.exit(0);
});

// Helper function to execute SQL queries with error handling
export async function sql(query: string, params: any[] = []): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    console.error('SQL Query Error:', {
      query: query.substring(0, 100) + '...',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
