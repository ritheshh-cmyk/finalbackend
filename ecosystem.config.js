module.exports = {
  apps: [{
    name: 'mobile-repair-backend',
    script: 'dist/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 10000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 10000
    }
  }]
};
