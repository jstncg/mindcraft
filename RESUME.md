# Resume — sim state as of 2026-09-03 22:53 EDT

## Start it up
```sh
docker start mc          # ~45s to load the world
cd ~/mindcraft
./fresh.sh --world       # new world + blank minds  (omit --world to keep this one)
./run.sh                 # applies difficulty + border, starts bots and backup loop
```
`./stop.sh` stops bots and takes a final world backup.

## Config
| | |
|---|---|
| Fork | `origin` = jstncg/mindcraft, `upstream` = kolbytn/mindcraft |
| Branch | `develop` @ 99f992a |
| World seed | 3167240320522645568 |
| Border | 2500 wide, centred on spawn (-336, 80) |
| Difficulty | normal — starvation cripples to 1HP but does not kill |
| Memory | `load_memory: false`; every sim starts cold |
| Models | 5x claude-haiku-4-5, 2x gpt-5.4-mini, 2x gemini-flash, 2x deepseek |
| Embedding | openai text-embedding-3-small (must be `{api, model}` form) |
| Cost | ~$12/h at 10 bots |

## Four fixes committed but NEVER RUN
Sim 9 will be the first with these live:
1. `!explore` — never worked in any sim (null `y` rejected by goToPosition)
2. `craftRecipe` — reported success without checking; broke the table mid-craft
3. `Could not find <bot>` — meant out-of-render-range, now says so
4. `!goToCoordinates` — optional params now honoured

## What to check first
```sh
grep -c "CRITIC ACCEPT" run.log; grep -c "CRITIC REJECT" run.log   # want a real split, not 0/N
ls learned_skills/                                                  # never yet non-empty
cat bots/*/lessons.json | grep -c '"source"'                        # propagation
grep -c "Stopped 0 legs out" run.log                                # explore should no longer fail on leg 1
```

## Forensics
Use `bots/<name>/histories/*.json` — attributed per bot. `run.log` interleaves
10 agents; it now prints `[Name] executed:` but per-bot histories are better.

## Open queue
- Automatic curriculum (Voyager) — fixes goal re-declaration
- Evaluation harness (MineNPC-Task) — needed before any 12h run
- Surprise-gated lesson writes (D-MEM) — replaces score-based eviction
- Rules that run without an LLM call (mindcraft-mcgavin) — cost
- Prompt caching — needs $COMMAND_DOCS moved to the front, changes behaviour

## Research dossier
https://claude.ai/code/artifact/7aa11018-8011-4484-84eb-8298193fbb49
