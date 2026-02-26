#!/bin/bash

# Dev script that properly handles shutdown and emulator export

# Store PIDs
EMU_PID=""
API_PID=""
WEB_PID=""

# Cleanup function
cleanup() {
  echo ""
  echo "🛑 Shutting down..."

  # Kill API and Web first
  if [ -n "$API_PID" ] && kill -0 $API_PID 2>/dev/null; then
    echo "Stopping API..."
    kill $API_PID 2>/dev/null
  fi

  if [ -n "$WEB_PID" ] && kill -0 $WEB_PID 2>/dev/null; then
    echo "Stopping Web..."
    kill $WEB_PID 2>/dev/null
  fi

  # Wait a moment for them to stop
  sleep 1

  # Now stop emulator (this will trigger export)
  if [ -n "$EMU_PID" ] && kill -0 $EMU_PID 2>/dev/null; then
    echo "Stopping Emulator (exporting data)..."
    kill $EMU_PID 2>/dev/null
    # Wait for emulator to finish exporting
    wait $EMU_PID 2>/dev/null
  fi

  echo "✅ Shutdown complete"
  exit 0
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Build shared first
echo "📦 Building shared package..."
pnpm dev:shared

# Create emulator data directory if it doesn't exist
mkdir -p .emulator-data

echo "🚀 Starting development servers..."
echo ""

# Start emulator
pnpm emulators &
EMU_PID=$!

# Wait for emulator to be ready
sleep 5

# Start API
pnpm dev:api &
API_PID=$!

# Start Web
pnpm dev:web &
WEB_PID=$!

echo ""
echo "✨ All services started!"
echo "   Emulator UI: http://localhost:4000"
echo "   API: http://localhost:5001"
echo "   Web: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all processes
wait
