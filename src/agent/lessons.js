import fs from 'fs';

// civ: what a bot has worked out about the world. Unlike $MEMORY this is
// append-only - the summarizer rewrites memory every few minutes, so a lesson
// learned at minute 5 was gone by minute 20 and nothing ever accumulated.
// Lessons spread: !lesson shouts, and every bot in earshot writes it down.
const MAX = 25;
const file = name => `./bots/${name}/lessons.json`;

// civ: the split is verifiability, not subject matter. If a claim names an agent
// it cannot be checked against the world - only against that agent's later
// behaviour - so it stays a belief, and it keeps whoever said it attached.
export function classify(text, names) {
    return names.some(n => new RegExp(`\\b${n}\\b`, 'i').test(text)) ? 'belief' : 'fact';
}

export function load(name) {
    try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
    catch { return []; }
}

// returns true if this is new to us
export function add(name, text, source = null, names = []) {
    text = String(text).trim().replace(/\s+/g, ' ').slice(0, 160);
    if (!text) return false;
    const lessons = load(name);
    const key = t => t.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (lessons.some(l => key(l.text) === key(text))) return false;
    lessons.push({ text, kind: classify(text, names), source, t: Date.now() });
    while (lessons.length > MAX) lessons.shift(); // oldest out
    fs.mkdirSync(`./bots/${name}`, { recursive: true });
    fs.writeFileSync(file(name), JSON.stringify(lessons, null, 2));
    return true;
}

export function format(name) {
    const lessons = load(name);
    if (!lessons.length) return '';
    const facts = lessons.filter(l => l.kind !== 'belief');
    const beliefs = lessons.filter(l => l.kind === 'belief');
    let out = '';
    if (facts.length)
        out += 'What you know about this world (hard-won, do not ignore):\n'
            + facts.map(l => `- ${l.text}${l.source ? ` (${l.source} said so)` : ''}`).join('\n') + '\n';
    if (beliefs.length)
        out += 'What you believe about people (you may be wrong, and you may have been lied to):\n'
            + beliefs.map(l => `- ${l.text}${l.source ? ` (${l.source} said so)` : ' (you saw this yourself)'}`).join('\n') + '\n';
    return out;
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
    assert(add(n, 'Cole steals from chests.', 'Ren', ['Cole','Ren']) === true, 'second lesson');
    assert(format(n).includes('Ren said so'), 'attribution shown');
    assert(load(n).find(l => l.text.startsWith('Cole')).kind === 'belief', 'naming an agent makes it a belief');
    assert(load(n).find(l => l.text.startsWith('Cooked')).kind === 'fact', 'a world claim is a fact');
    assert(format(n).includes('you may have been lied to'), 'beliefs are flagged as fallible');
    for (let i = 0; i < 30; i++) add(n, `filler lesson ${i}`);
    assert(load(n).length === MAX, `capped at ${MAX}`);
    assert(!format(n).includes('Cooked mutton'), 'oldest lesson evicted first');
    assert(load(n)[0].text === 'filler lesson 5', 'FIFO eviction');

    fs.rmSync(`./bots/${n}`, { recursive: true, force: true });
    console.log('lessons ok');
}
