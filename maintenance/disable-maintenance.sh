#!/bin/bash
# Manual script to disable Maintenance Mode and restore production CRM
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "✨ Disabling Maintenance Mode and restoring Shanthi Ayurvedas CRM..."

docker stop shanthi_maintenance 2>/dev/null || true
docker rm -f shanthi_maintenance 2>/dev/null || true

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

$DC up -d --force-recreate frontend

echo "✅ Shanthi Ayurvedas CRM is back ONLINE!"
