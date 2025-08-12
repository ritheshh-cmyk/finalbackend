# Modular Robust Startup System for Node.js/TS Backends

## Overview
This backend uses a highly robust, modular startup system for automated deployment, monitoring, and operation. It is designed for Ubuntu, Termux, and other Linux environments.

## Files
- `startup.sh`: Main script to install, build, start, and monitor the backend. Modular and parameterized for reuse.
- `lib.sh`: Shared shell library with robust functions for logging, tool checks, health checks, PM2/ngrok setup, log rotation, and more.
- `watchdog.sh`: Auto-generated script for 24/7 health monitoring (add to cron).

## Features
- Dependency, tool, and environment checks
- Auto-update from git, auto-install, auto-build
- Lint, test, audit, and typecheck before build
- PM2 process management and auto-restart
- ngrok tunnel with reserved domain and config automation
- Health checks and watchdog script
- Log rotation and cleanup
- Port conflict detection
- CLI flags for customization
- Performance info and logging
- Accessibility info (LAN/external URL)
- Trap handler and script versioning
- Modular: Easily adapt for other codebases

## Usage
```sh
bash startup.sh [--no-build] [--skip-ngrok] [--debug] [--port 10000]
```

## Adapting for Other Codebases
- Copy `lib.sh` and `startup.sh` to your project.
- Edit in `startup.sh`:
  - `PROJECT_NAME`: PM2 process name
  - `ENTRY`: Entry point for your backend
  - `HEALTH_PATH`: Health endpoint path
  - `REPO_URL`: Git repo URL
  - `NGROK_DOMAIN`, `NGROK_AUTHTOKEN`: ngrok reserved domain and token
- Ensure your backend exposes a health endpoint (e.g., `/health`).
- Place `lib.sh` in the same directory or adjust the source path in `startup.sh`.

## Watchdog Setup
Add to crontab for 24/7 monitoring:
```
*/2 * * * * bash /path/to/backend/watchdog.sh
```

## Notes
- No Telegram notifications (privacy/security by request)
- Designed for production and developer experience
- For further customization, edit or extend `lib.sh`

--- 