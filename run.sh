#!/bin/bash

# ============================================================
#  Am I Reachable? — Runner Script
#  Portable, fast, works in /opt or any directory
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; }
info()   { echo -e "${CYAN}[…]${NC} $1"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Am I Reachable? v3.0             ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── 1. Check Node & npm ──────────────────────────────────────
if ! command -v node &>/dev/null; then
  error "Node.js not found. Install it: https://nodejs.org"
  exit 1
fi
if ! command -v npm &>/dev/null; then
  error "npm not found."
  exit 1
fi
NODE_VER=$(node -v)
log "Node.js $NODE_VER detected"

# ── 2. Fix permissions if needed ─────────────────────────────
fix_permissions() {
  local dir="$1"
  if [ ! -w "$dir" ]; then
    warn "No write permission in $dir. Attempting fix with sudo..."
    sudo chown -R "$(whoami)":"$(whoami)" "$dir" 2>/dev/null || {
      error "Could not fix permissions. Run: sudo chown -R \$(whoami) $SCRIPT_DIR"
      exit 1
    }
    log "Permissions fixed."
  fi
}

fix_permissions "$BACKEND_DIR"
fix_permissions "$FRONTEND_DIR"

# ── 3. Create .env files ──────────────────────────────────────
if [ ! -f "$BACKEND_DIR/.env" ]; then
  printf "PORT=3001\nNODE_ENV=development\n" > "$BACKEND_DIR/.env"
  log "Created backend/.env"
fi

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
  printf "NEXT_PUBLIC_API_URL=http://localhost:3001/api\n" > "$FRONTEND_DIR/.env.local"
  log "Created frontend/.env.local"
fi

# ── 4. Install backend dependencies ──────────────────────────
info "Installing backend dependencies (without Puppeteer for speed)..."
cd "$BACKEND_DIR"

# Install everything EXCEPT puppeteer first (puppeteer is huge ~300MB)
# We mark it as optional in the scan options instead
npm install --ignore-scripts 2>&1 | tail -5

# Try to install puppeteer separately (non-blocking, optional)
if ! node -e "require('puppeteer')" &>/dev/null 2>&1; then
  info "Installing Puppeteer for screenshots (optional, ~300MB)..."
  npm install puppeteer --ignore-scripts 2>/dev/null &
  PUPPETEER_PID=$!
  warn "Puppeteer installing in background (screenshots available after it completes)"
else
  log "Puppeteer already installed (screenshots available)"
fi

log "Backend dependencies ready"

# ── 5. Install frontend dependencies ─────────────────────────
info "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install 2>&1 | tail -5
log "Frontend dependencies ready"

# ── 6. Start services ─────────────────────────────────────────
echo ""
log "Starting services..."
echo -e "   ${CYAN}Backend :${NC}  http://localhost:3001"
echo -e "   ${CYAN}Frontend:${NC}  http://localhost:3000"
echo ""
echo -e "   Press ${RED}Ctrl+C${NC} to stop"
echo ""

cleanup() {
  echo ""
  warn "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  # Also kill puppeteer background install if still running
  kill "$PUPPETEER_PID" 2>/dev/null
  wait 2>/dev/null
  log "All services stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
cd "$BACKEND_DIR"
node src/server.js &
BACKEND_PID=$!

# Wait briefly to catch immediate crash
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  error "Backend crashed on startup. Check logs above."
  exit 1
fi
log "Backend running (PID $BACKEND_PID)"

# Start frontend
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

sleep 2
if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
  error "Frontend crashed on startup. Check logs above."
  kill "$BACKEND_PID" 2>/dev/null
  exit 1
fi
log "Frontend running (PID $FRONTEND_PID)"

echo ""
log "Everything is running! Open http://localhost:3000"
echo ""

# Keep script alive, show logs from both
wait "$BACKEND_PID" "$FRONTEND_PID"
