// Comprehensive health check for Docker and production monitoring
const http = require('http');
const { Pool } = require('pg');

// Create a test database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 1,
  connectionTimeoutMillis: 5000
});

async function healthCheck() {
  try {
    // Test HTTP endpoint
    const options = {
      host: 'localhost',
      port: process.env.PORT || 10000,
      path: '/health',
      timeout: 3000
    };

    const httpHealthCheck = new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`HTTP health check failed with status ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.setTimeout(3000, () => reject(new Error('HTTP health check timeout')));
      req.end();
    });

    // Test database connection
    const dbHealthCheck = async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    };

    // Run both checks
    await Promise.all([httpHealthCheck, dbHealthCheck()]);
    
    console.log('✅ Health check passed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

healthCheck();
