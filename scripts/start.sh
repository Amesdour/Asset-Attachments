#!/bin/bash
set -e

echo "Building frontend..."
cd /home/runner/workspace
pnpm --filter @workspace/landfill-dashboard run build

echo "Building API server..."
PORT=5000 pnpm --filter @workspace/api-server run build

echo "Freeing port 5000 (last-moment)..."
fuser -k 5000/tcp 2>/dev/null || true
sleep 1

echo "Starting server on port 5000 (API + static frontend)..."
PORT=5000 pnpm --filter @workspace/api-server run start
