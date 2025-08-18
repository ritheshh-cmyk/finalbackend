module.exports = {
  apps: [{
    name: 'callmemobiles-backend',
    script: 'dist/server/index.js',
    cwd: '/var/www/callmemobiles-backend',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Logging
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Memory and restart management
    max_memory_restart: '500M',
    restart_delay: 4000,
    max_restarts: 5,
    min_uptime: '10s',
    
    // Advanced options
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    watch_options: {
      followSymlinks: false
    },
    
    // Health monitoring
    health_check_url: 'http://localhost:5000/api/health',
    health_check_grace_period: 3000,
    
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Auto-restart on file changes (development only)
    autorestart: true,
    
    // Node.js specific options
    node_args: '--max-old-space-size=2048'
  }],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/ritheshh-cmyk/finalbackend.git',
      path: '/var/www/callmemobiles-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs npm',
      'post-setup': 'npm install --production && npm run build',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: 'root',
      host: 'staging-server',
      ref: 'origin/develop',
      repo: 'https://github.com/ritheshh-cmyk/finalbackend.git',
      path: '/var/www/callmemobiles-backend-staging',
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001
      }
    }
  }
};
