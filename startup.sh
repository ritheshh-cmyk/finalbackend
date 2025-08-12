#!/usr/bin/env bash
# Modular, robust startup script for Node.js/TS backends
# Usage: bash startup.sh [--no-build] [--skip-ngrok] [--debug] [--port 10000]

set -euo pipefail
SCRIPT_VERSION="3.0.0"
START_TIME=$(date +%s)
PID=$$
REPO_URL="https://github.com/ritheshh-cmyk/expensobackend.git"
PROJECT_NAME="mobile-repair-backend"
ENTRY="dist/server/index.js"
HEALTH_PATH="/health"
NGROK_DOMAIN="positive-kodiak-friendly.ngrok-free.app"
NGROK_AUTHTOKEN="2z66Kn4W25ApQ7mjI3Z8BqDfFbI_4GPA3KoVKk25MpvFcKL2a"
PORT=10000
LOG_MAX_SIZE=51200

# --- Source common library ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/lib.sh"

# --- CLI Flags ---
NO_BUILD=0
SKIP_NGROK=0
DEBUG=0
for arg in "$@"; do
  case $arg in
    --no-build) NO_BUILD=1 ;;
    --skip-ngrok) SKIP_NGROK=1 ;;
    --debug) DEBUG=1 ;;
    --port) shift; PORT=$1 ;;
  esac
  shift || true
done
[ "$DEBUG" -eq 1 ] && set -x

trap 'log "[$(date)] [PID $PID] Script interrupted. Cleaning up..."; exit 1' INT TERM

# --- Self-update/clone if missing ---
if [ ! -d .git ]; then
  log "No git repo found, cloning fresh..."
  git clone "$REPO_URL" .
fi

# --- Security: .env ---
if [ -f .env ]; then
  chmod 600 .env
  log "Secured .env permissions."
else
  [ -f env-example.txt ] && cp env-example.txt .env && log "Created .env from template."
fi

# --- Tool Checks ---
require_tools node npm pm2 ngrok curl lsof

# --- Log all versions ---
log "📦 Versions:"
node -v
npm -v
pm2 -v
ngrok version

# --- Cleanliness: Rotate ngrok.log ---
rotate_log ngrok.log $LOG_MAX_SIZE
rm -f ngrok.log

# --- Auto-update ---
git pull || true
npm install

# --- Lint, Test, Audit, TypeCheck ---
npm run lint || { log "❌ Lint errors!"; exit 1; }
npm test || log "⚠️ Some tests failed — continuing..."
npm audit --audit-level=high || log "⚠️ Vulnerabilities found in dependencies"
npx tsc --noEmit

# --- Build & Validation ---
if [ "$NO_BUILD" -eq 0 ]; then
  npm run build
  log "Build completed."
fi

# --- Port Conflict Check ---
if port_in_use $PORT; then
  log "Port $PORT is already in use! Aborting."
  exit 1
fi

# --- PM2 Setup ---
pm2_restart "$PROJECT_NAME" "$ENTRY" "$PORT"
log "Backend started with PM2."

# --- Health Check ---
if ! health_check "http://localhost:$PORT$HEALTH_PATH" 5 2; then
  log "Backend health check failed!"
  pm2 logs "$PROJECT_NAME" --lines 30
  exit 1
fi
log "Backend health check passed."

# --- NGROK Setup ---
if [ "$SKIP_NGROK" -eq 0 ]; then
  ngrok_setup "$NGROK_AUTHTOKEN" "$NGROK_DOMAIN" "$PORT"
  log "ngrok tunnel started: https://$NGROK_DOMAIN"
  sleep 3
  if ! grep -q "client session established" ngrok.log; then
    log "ngrok may not have started correctly. Check ngrok.log."
  fi
fi

# --- Performance Info ---
END_TIME=$(date +%s)
log "Startup time: $((END_TIME-START_TIME)) seconds"
log "CPU: $(grep 'model name' /proc/cpuinfo | head -1)"
log "Memory: $(free -h | grep Mem)"
log "Disk: $(df -h . | tail -1)"

# --- Accessibility ---
LAN_IP=$(get_lan_ip)
log "LAN IP: http://$LAN_IP:$PORT"
log "External URL: https://$NGROK_DOMAIN"

# --- Script Version & PID ---
log "Script version: $SCRIPT_VERSION, PID: $$"

# --- Watchdog (optional, for cron) ---
cat > watchdog.sh <<WD
#!/usr/bin/env bash
health_check http://localhost:$PORT$HEALTH_PATH 2 2 || {
  echo "❌ Backend down! Restarting..."
  pm2 restart $PROJECT_NAME
}
WD
chmod +x watchdog.sh
log "Watchdog script created. Add to cron: */2 * * * * bash $(pwd)/watchdog.sh"

log "✅ All done!"
# ---
# To adapt for other codebases:
# - Change PROJECT_NAME, ENTRY, HEALTH_PATH, REPO_URL, NGROK_DOMAIN, NGROK_AUTHTOKEN as needed
# - Place lib.sh in the same directory or adjust the source path
# - Ensure your backend exposes a health endpoint 