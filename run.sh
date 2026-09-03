#!/bin/sh
# start bots + every 20 min: world snapshot + digest. logs: run.log, loop.log
cd ~/mindcraft && nohup node main.js > run.log 2>&1 & echo "bots pid $!"
nohup sh -c 'while true; do sleep 1200; docker exec mc rcon-cli save-all >/dev/null; mkdir -p ~/mc-backups; tar czf ~/mc-backups/$(date +%Y%m%d-%H%M).tgz -C ~/mc world; node ~/mindcraft/digest.mjs 20; done' > loop.log 2>&1 & echo "loop pid $!"
