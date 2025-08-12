import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration for Supabase with better error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of connections (lower for Supabase)
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Connection timeout
  ssl: {
    rejectUnauthorized: false
  },
  // Additional Supabase-specific settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Add comprehensive error handling for the pool
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  // Don't crash the app on pool errors - just log them
});

pool.on('connect', (client) => {
  console.log('✅ Database connection established');
  
  // Add error handler to individual client connections
  client.on('error', (err) => {
    console.error('❌ Client connection error:', err.message);
    // Don't let client errors crash the app
  });
});

pool.on('remove', (client) => {
  console.log('🔌 Database connection removed from pool');
});

// Test the connection on startup with error handling
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection test failed:', err.message);
    console.log('⚠️ Continuing without database connection test...');
  } else {
    console.log('✅ Database connection test successful');
  }
});

// Handle unhandled pool errors to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  if (reason && typeof reason === 'object' && 'code' in reason) {
    const error = reason as any;
    if (error.code === 'XX000' || error.message?.includes('db_termination')) {
      console.error('🔄 Database connection terminated, but continuing...');
      return; // Don't crash on database termination
    }
  }
  console.error('❌ Unhandled rejection:', reason);
});

// Handle process errors
process.on('uncaughtException', (error) => {
  if (error.message?.includes('db_termination') || error.message?.includes('XX000')) {
    console.error('🔄 Database connection error caught, continuing...');
    return; // Don't crash on database errors
  }
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

export const db = drizzle(pool, { schema });

// Export sql function for direct queries using pool with proper result handling
export const sql = async (query: string, params?: any[]) => {
  const result = await pool.query(query, params);
  return result.rows;
};