#!/bin/bash
# Manual script to activate Maintenance Mode on Shanthi Ayurvedas CRM VPS
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "🚧 Activating Maintenance Mode for Shanthi Ayurvedas CRM..."

# Stop production frontend
docker stop shanthi_frontend 2>/dev/null || true
docker rm -f shanthi_frontend 2>/dev/null || true

for port in 8087 89; do
  pids=$(docker ps -q --filter "publish=$port")
  if [ -n "$pids" ]; then
    docker stop $pids 2>/dev/null || true
    docker rm -f $pids 2>/dev/null || true
  fi
done

docker rm -f shanthi_maintenance 2>/dev/null || true

docker run -d --name shanthi_maintenance --restart always \
  -p 8087:80 -p 89:80 \
  -v "$DIR/maintenance/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$DIR/maintenance/maintenance.html:/usr/share/nginx/html/maintenance.html:ro" \
  nginx:alpine

echo "✅ Maintenance Mode is now ACTIVE on ports 8087 and 89."
echo "Visitors to shanthiayurvedas.com will now see the Under Maintenance page."
