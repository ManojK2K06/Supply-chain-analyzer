#!/bin/bash
# ── GEOPOLITICAL RADAR — Launch Script ──────────────────────────────────────
set -e

echo ""
echo "  ██████╗ ███████╗ ██████╗ ██████╗  ██████╗ ██╗     ██╗████████╗██╗ ██████╗ █████╗ ██╗"
echo "  ██╔════╝ ██╔════╝██╔═══██╗██╔══██╗██╔═══██╗██║     ██║╚══██╔══╝██║██╔════╝██╔══██╗██║"
echo "  ██║  ███╗█████╗  ██║   ██║██████╔╝██║   ██║██║     ██║   ██║   ██║██║     ███████║██║"
echo "  ██║   ██║██╔══╝  ██║   ██║██╔═══╝ ██║   ██║██║     ██║   ██║   ██║██║     ██╔══██║██║"
echo "  ╚██████╔╝███████╗╚██████╔╝██║     ╚██████╔╝███████╗██║   ██║   ██║╚██████╗██║  ██║███████╗"
echo "   ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝      ╚═════╝ ╚══════╝╚═╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝"
echo ""
echo "  RADAR — Global Conflict & Supply Chain Intelligence Platform"
echo "  ─────────────────────────────────────────────────────────────"
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "  ✗ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

NODE_VER=$(node -v)
echo "  ✓ Node.js $NODE_VER"

# Install dependencies
echo ""
echo "  → Installing server dependencies..."
cd server && npm install --silent
cd ..

echo "  → Installing client dependencies..."
cd client && npm install --silent
cd ..

echo ""
echo "  → Starting services..."
echo ""
echo "  Backend  : http://localhost:3001"
echo "  Frontend : http://localhost:3000"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""

# Start both
(cd server && node index.js) &
SERVER_PID=$!

sleep 3

(cd client && BROWSER=none npm start) &
CLIENT_PID=$!

trap "echo ''; echo '  Shutting down...'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM

wait
