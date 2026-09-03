import fs from 'fs';

// civ: what a bot has worked out about the world. Unlike $MEMORY this is
// append-only - the summarizer rewrites memory every few minutes, so a lesson
// learned at minute 5 was gone by minute 20 and nothing ever accumulated.
// Lessons spread: !lesson shouts, and every bot in earshot writes it down.
const MAX = 10;
const file = name => `./bots/${name}/lessons.json`;

export function load(name) {
    try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
    catch { return []; }
}

// returns true if this is new to us
export function add(name, text, source = null) {
    text = String(text).trim().replace(/\s+/g, ' ').slice(0, 160);
    if (!text) return false;
    const lessons = load(name);
    const key = t => t.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (lessons.some(l => key(l.text) === key(text))) return false;
    lessons.push({ text, source, t: Date.now() });
    while (lessons.length > MAX) lessons.shift(); // oldest out
    fs.mkdirSync(`./bots/${name}`, { recursive: true });
    fs.writeFileSync(file(name), JSON.stringify(lessons, null, 2));
    return true;
}

export function format(name) {
    const lessons = load(name);
    if (!lessons.length) return '';
    return 'What you have learned (hard-won, do not ignore):\n'
        + lessons.map(l => `- ${l.text}${l.source ? ` (from ${l.source})` : ''}`).join('\n') + '\n';
}

// node src/agent/lessons.js
if (import.meta.url === `file://${process.argv[1]}`) {
    const assert = (c, m) => { if (!c) throw new Error(m); };
    const n = '__test__';
    fs.rmSync(`./bots/${n}`, { recursive: true, force: true });

    assert(load(n).length === 0, 'starts empty');
    assert(format(n) === '', 'no lessons, no prompt text');
    assert(add(n, 'Cooked mutton restores 3x what raw does.') === true, 'first lesson is new');
    assert(add(n, 'cooked  mutton restores 3X what raw does!') === false, 'near-duplicate rejected');
    assert(add(n, '   ') === false, 'blank rejected');
    assert(add(n, 'Cole steals from chests.', 'Ren') === true, 'second lesson');
    assert(format(n).includes('(from Ren)'), 'attribution shown');
    for (let i = 0; i < 12; i++) add(n, `filler lesson ${i}`);
    assert(load(n).length === MAX, `capped at ${MAX}`);
    assert(!format(n).includes('Cooked mutton'), 'oldest lesson evicted first');
    assert(load(n)[0].text === 'filler lesson 2', 'FIFO eviction');

    fs.rmSync(`./bots/${n}`, { recursive: true, force: true });
    console.log('lessons ok');
}
