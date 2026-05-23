#!/bin/bash
set -e

echo "Building API server..."
cd /home/runner/workspace
PORT=3001 pnpm --filter @workspace/api-server run build

echo "Starting API server on port 3001..."
PORT=3001 pnpm --filter @workspace/api-server run start &
API_PID=$!

echo "Starting frontend on port 5000..."
pnpm --filter @workspace/landfill-dashboard run dev &
VITE_PID=$!

# Wait for either process to exit
wait -n $API_PID $VITE_PID
