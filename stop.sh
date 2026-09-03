#!/bin/sh
# stop bots, save world, back it up to ~/mc-backups/<timestamp>.tgz
pkill -f "node main.js"; pkill -f "sleep 1200"; docker exec mc rcon-cli save-all >/dev/null
mkdir -p ~/mc-backups && tar czf ~/mc-backups/$(date +%Y%m%d-%H%M).tgz -C ~/mc world && ls -la ~/mc-backups | tail -1
