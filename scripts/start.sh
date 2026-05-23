#!/bin/bash
set -e

echo "Building API server..."
cd /home/runner/workspace
PORT=5000 pnpm --filter @workspace/api-server run build

echo "Starting server on port 5000 (API + static frontend)..."
PORT=5000 pnpm --filter @workspace/api-server run start
