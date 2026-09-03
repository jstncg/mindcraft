#!/bin/sh
# ponytail: 10-min health check. usage: ./check.sh [minutes]
M=${1:-10}
echo "== server events (last ${M}m) =="; docker logs mc --since ${M}m 2>&1 | grep -E '<|died|was |joined|left|fell|blew' | tail -30
echo "== bot status =="; for b in ~/mindcraft/bots/*/; do n=$(basename $b); c=$(find $b/logs -type f -mmin -$M 2>/dev/null | wc -l | tr -d ' '); echo "$n: $c prompt logs in last ${M}m"; done
echo "== errors =="; grep -h "brain disconnected\|Error" ~/mindcraft/run.log 2>/dev/null | tail -5
