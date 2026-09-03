#!/bin/sh
# Start a sim from nothing: no memories, no lessons, no diaries, optional new world.
# Usage: ./fresh.sh            keep the world, wipe the minds
#        ./fresh.sh --world    also delete the world and regenerate from the seed
set -e
cd ~/mindcraft
./stop.sh >/dev/null 2>&1 || true

echo "wiping minds:"
for d in bots/*/; do
  name=$(basename "$d")
  [ "$name" = "execTemplate.js" ] && continue
  rm -f "$d/memory.json" "$d/lessons.json"
  rm -rf "$d/histories" "$d/logs" "$d/action-code" "$d/screenshots"
  echo "  $name"
done
rm -f bots/positions.jsonl run.log
rm -rf digest

if [ "$1" = "--world" ]; then
  echo "regenerating world from seed $(grep '^level-seed=' ~/mc/server.properties | cut -d= -f2)"
  docker exec mc rcon-cli save-off >/dev/null 2>&1 || true
  tar czf ~/mc-backups/pre-wipe-$(date +%Y%m%d-%H%M).tgz -C ~/mc world
  docker stop mc >/dev/null
  rm -rf ~/mc/world ~/mc/world_nether ~/mc/world_the_end
  docker start mc >/dev/null
  printf 'waiting for world generation'
  while ! docker exec mc rcon-cli list >/dev/null 2>&1; do printf '.'; sleep 5; done
  echo " done"
fi

echo "ready. run ./run.sh"
