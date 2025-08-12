#!/usr/bin/env bash
# lib.sh - Common shell library for robust Node.js/TS backend startup scripts
#
# Usage: Source this file in your startup.sh:
#   . "$(dirname \"${BASH_SOURCE[0]}\")/lib.sh"
#
# Provides: log, err, require_tools, health_check, pm2_restart, ngrok_setup, rotate_log, is_termux, is_ubuntu, port_in_use, get_lan_ip
#
# To adapt for other codebases: Use these functions in your own startup scripts. See backend/startup.sh for example usage.

# --- Logging ---
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[ERROR] $*" >&2; }

# --- Tool Checks ---
require_tools() {
  for tool in "$@"; do
    command -v $tool >/dev/null 2>&1 || { err "Missing required tool: $tool"; exit 1; }
  done
}

# --- Health Check ---
health_check() {
  local url="$1"; local retries="${2:-5}"; local delay="${3:-2}"
  for i in $(seq 1 $retries); do
    if curl -fs "$url" >/dev/null; then return 0; fi
    sleep $delay
  done
  return 1
}

# --- PM2 Setup ---
pm2_restart() {
  local name="$1"; local entry="$2"; local port="$3"
  pm2 delete "$name" || true
  pm2 start "$entry" --name "$name" -- --port "$port"
  pm2 save
  pm2 startup || true
}

# --- Ngrok Setup ---
ngrok_setup() {
  local authtoken="$1"; local domain="$2"; local port="$3"
  ngrok config add-authtoken "$authtoken" || true
  mkdir -p /root/.config/ngrok
  cat > /root/.config/ngrok/ngrok.yml <<EOF
version: 3
agent:
  authtoken: $authtoken
tunnels:
  backend:
    addr: $port
    proto: http
    domain: $domain
EOF
  nohup ngrok start backend > ngrok.log 2>&1 &
}

# --- Log Rotation ---
rotate_log() {
  local file="$1"; local max_size="${2:-51200}"
  if [ -f "$file" ] && [ "$(stat -c%s "$file")" -gt "$max_size" ]; then
    mv "$file" "$file.bak"
    touch "$file"
    log "Rotated $file"
  fi
}

# --- Env Detection ---
is_termux() { grep -qi termux <<< "$PREFIX"; }
is_ubuntu() { grep -qi ubuntu /etc/os-release 2>/dev/null; }

# --- Port Conflict ---
port_in_use() { lsof -i:"$1" >/dev/null 2>&1; }

# --- LAN IP ---
get_lan_ip() { hostname -I | awk '{print $1}'; } 