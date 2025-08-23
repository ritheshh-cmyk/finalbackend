module.exports = {
  apps: [{
    name: 'callmemobiles-backend',
    script: 'dist/server/index.js',
    cwd: '/var/www/callmemobiles-backend',
    instances: 1, // Start with 1 instance for stability
    exec_mode: 'fork', // Use fork mode for better debugging
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 10000 // Fixed port
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 10000, // Fixed port to match backend
      DATABASE_URL: process.env.DATABASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      JWT_SECRET: process.env.JWT_SECRET
    },
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Memory and restart management
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 5,
    min_uptime: '10s',
    
    // Health monitoring
    health_check_url: 'http://localhost:10000/health',
    health_check_grace_period: 3000,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Auto-restart
    autorestart: true,
    
    // Node.js options
    node_args: '--max-old-space-size=2048'
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/ritheshh-cmyk/finalbackend.git',
      path: '/var/www/callmemobiles-backend',
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      env: {
        NODE_ENV: 'production',
        PORT: 10000
      }
    }
  }
};