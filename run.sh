#!/bin/sh
# start bots + every 20 min: world snapshot + digest. logs: run.log, loop.log
docker exec mc rcon-cli difficulty normal >/dev/null  # hunger cripples to 1HP but does not kill - the learner survives the lesson
# civ: 1500 blocks around spawn. Holds the village, mineshaft, ocean, taiga, swamp
# and savanna, and stops a bot walking east forever. World border is vanilla.
docker exec mc rcon-cli "worldborder center -336 80" >/dev/null
docker exec mc rcon-cli "worldborder set 1500" >/dev/null
docker exec mc rcon-cli "worldborder warning distance 40" >/dev/null
cd ~/mindcraft && nohup node main.js > run.log 2>&1 & echo "bots pid $!"
nohup sh -c 'while true; do sleep 1200; docker exec mc rcon-cli save-all >/dev/null; mkdir -p ~/mc-backups; tar czf ~/mc-backups/$(date +%Y%m%d-%H%M).tgz -C ~/mc world; node ~/mindcraft/digest.mjs 20; done' > loop.log 2>&1 & echo "loop pid $!"
