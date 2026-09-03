import fs from 'fs';

// civ: what a bot has worked out about the world. Unlike $MEMORY this is append-only -
// the summariser rewrites memory every few minutes, so a lesson learned at minute 5 was
// gone by minute 20 and nothing ever accumulated.
//
// Shaped by four findings, each of which cost us something:
//   - a claim naming an agent cannot be checked against the world, only against that
//     agent's later behaviour, so it stays a belief and keeps its source
//   - what you saw yourself and what someone shouted at you are not the same evidence
//     (Mandela Effect, arXiv 2602.00428: unchecked cross-agent citation is the mechanism)
//   - a lesson is mostly about somewhere, so it carries where it was learned
//     (MrSteve place-event memory, arXiv 2411.06736)
//   - FIFO eviction drops the oldest, which is usually the most-confirmed. Evict the
//     least useful instead (the 2026 memory survey calls FIFO the crude case by name)
const MAX = 25;
const file = name => `./bots/${name}/lessons.json`;
const key = t => String(t).replace(/[^a-z0-9]/gi, '').toLowerCase();

// civ: the split is verifiability, not subject matter.
export function classify(text, names) {
    return names.some(n => new RegExp(`\\b${n}\\b`, 'i').test(text)) ? 'belief' : 'fact';
}

export function load(name) {
    try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); }
    catch { return []; }
}

function write(name, lessons) {
    fs.mkdirSync(`./bots/${name}`, { recursive: true });
    fs.writeFileSync(file(name), JSON.stringify(lessons, null, 2));
}

// civ: what a lesson is worth keeping for. Seeing it yourself beats being told;
// every bot who independently confirms it adds; a dispute costs more than a
// confirmation gains, because a contested claim is the dangerous kind.
export function score(l) {
    return (l.source ? 1 : 2)
        + (l.confirmations || 0)
        - 2 * ((l.disputes || []).length);
}

export function add(name, text, source = null, names = [], at = null) {
    text = String(text).trim().replace(/\s+/g, ' ').slice(0, 160);
    if (!text) return false;
    const lessons = load(name);

    // heard something we already hold: that is corroboration, not a duplicate
    const existing = lessons.find(l => key(l.text) === key(text));
    if (existing) {
        if (source && source !== existing.source && !(existing.heardFrom || []).includes(source)) {
            (existing.heardFrom = existing.heardFrom || []).push(source);
            existing.confirmations = (existing.confirmations || 0) + 1;
            write(name, lessons);
        }
        return false;
    }

    lessons.push({
        text,
        kind: classify(text, names),
        source,                       // null means we worked it out ourselves
        at: at ? { x: Math.round(at.x), z: Math.round(at.z) } : null,
        confirmations: 0,
        disputes: [],
        t: Date.now(),
    });
    // evict the least useful, not the oldest; oldest only breaks ties
    while (lessons.length > MAX) {
        let worst = 0;
        for (let i = 1; i < lessons.length; i++)
            if (score(lessons[i]) < score(lessons[worst])) worst = i;
        lessons.splice(worst, 1);
    }
    write(name, lessons);
    return true;
}

// civ: someone's own experience contradicts a stored claim. Nothing could do this
// before, so a false consensus was one-way - eight bots believed in a barrier and
// the only correction available was Nina drowning in it.
export function dispute(name, gist, why, by) {
    const lessons = load(name);
    const words = new Set(key(gist).match(/.{1,4}/g) || []);
    let best = null, bestHits = 0;
    for (const l of lessons) {
        const k = key(l.text);
        const hits = [...words].filter(w => k.includes(w)).length;
        if (hits > bestHits) { bestHits = hits; best = l; }
    }
    if (!best || bestHits < 3) return null;   // no confident match, change nothing
    if ((best.disputes || []).some(d => d.by === by)) return best;
    (best.disputes = best.disputes || []).push({ by, why: String(why).slice(0, 120) });
    write(name, lessons);
    return best;
}

const near = (l, pos) => !pos || !l.at
    ? Infinity
    : Math.hypot(l.at.x - pos.x, l.at.z - pos.z);

function line(l, pos) {
    const d = near(l, pos);
    const where = l.at ? ` [${l.at.x},${l.at.z}${d < Infinity ? `, ${Math.round(d)}m away` : ''}]` : '';
    const conf = l.confirmations ? ` (${l.confirmations + 1} of you have seen this)` : '';
    const dis = (l.disputes || []).map(d => ` DISPUTED by ${d.by}: ${d.why}`).join('');
    return `- ${l.text}${where}${conf}${dis}`;
}

export function format(name, pos = null) {
    const lessons = load(name);
    if (!lessons.length) return '';
    // nearest first - most of what you know is about somewhere
    const byPlace = (a, b) => near(a, pos) - near(b, pos);
    const seen = lessons.filter(l => l.kind !== 'belief' && !l.source).sort(byPlace);
    const told = lessons.filter(l => l.kind !== 'belief' && l.source).sort(byPlace);
    const beliefs = lessons.filter(l => l.kind === 'belief').sort(byPlace);

    let out = '';
    if (seen.length)
        out += 'What you worked out yourself (you were there):\n'
            + seen.map(l => line(l, pos)).join('\n') + '\n';
    if (told.length)
        out += 'What others told you. One person said each of these once - that is a claim, not a fact. '
            + 'If you find out otherwise, say so with !dispute.\n'
            + told.map(l => `${line(l, pos)} - ${l.source} said so`).join('\n') + '\n';
    if (beliefs.length)
        out += 'What you believe about people (you may be wrong, and you may have been lied to):\n'
            + beliefs.map(l => `${line(l, pos)}${l.source ? ` - ${l.source} said so` : ''}`).join('\n') + '\n';
    return out;
}

// node src/agent/lessons.js
if (import.meta.url === `file://${process.argv[1]}`) {
    const assert = (c, m) => { if (!c) throw new Error(m); };
    const n = '__test__';
    const clean = () => fs.rmSync(`./bots/${n}`, { recursive: true, force: true });
    clean();

    assert(load(n).length === 0 && format(n) === '', 'starts empty');

    // classification by verifiability
    assert(add(n, 'Cooked mutton restores far more than raw.'), 'first lesson');
    assert(add(n, 'Cole empties the chest when nobody is near.', 'Ren', ['Cole', 'Ren']), 'belief');
    assert(load(n).find(l => l.text.startsWith('Cole')).kind === 'belief', 'naming an agent makes a belief');
    assert(load(n).find(l => l.text.startsWith('Cooked')).kind === 'fact', 'a world claim is a fact');

    // seen vs told are presented as different evidence
    assert(add(n, 'There is water west of the beach.', 'Ori', ['Cole', 'Ren', 'Ori']), 'heard fact');
    const f = format(n);
    assert(f.includes('you were there'), 'own lessons headed as first-hand');
    assert(f.includes('that is a claim, not a fact'), 'heard lessons carry scepticism');
    assert(f.includes('Ori said so'), 'attribution kept');
    assert(f.includes('you may have been lied to'), 'beliefs flagged fallible');

    // hearing the same thing twice is corroboration, not a duplicate
    assert(add(n, 'there is  WATER west of the beach!', 'Ada', ['Ada', 'Ori']) === false, 'near-duplicate not re-added');
    const water = load(n).find(l => l.text.startsWith('There is water'));
    assert(water.confirmations === 1 && water.heardFrom.includes('Ada'), 'second teller corroborates');
    assert(format(n).includes('2 of you have seen this'), 'corroboration shown');

    // dispute
    assert(dispute(n, 'water west of the beach', 'I swam it, it is a lake', 'Nina'), 'dispute matches');
    assert(format(n).includes('DISPUTED by Nina'), 'dispute is visible');
    assert(dispute(n, 'totally unrelated nonsense xyzzy', 'no', 'Sam') === null, 'no confident match, no change');
    assert(load(n).find(l => l.text.startsWith('There is water')).disputes.length === 1, 'one dispute recorded');

    // scoring: seen > told, disputes cost more than confirmations gain
    assert(score({ source: null }) === 2 && score({ source: 'Ori' }) === 1, 'first-hand outscores hearsay');
    assert(score({ source: null, confirmations: 3 }) === 5, 'confirmations add');
    assert(score({ source: null, confirmations: 1, disputes: [{}, {}] }) === -1, 'disputes outweigh');

    // eviction drops the least useful, not the oldest
    clean();
    add(n, 'A hard-won and much confirmed thing.');
    for (let i = 0; i < 4; i++) add(n, 'A hard-won and much confirmed thing.', `bot${i}`, []);
    for (let i = 0; i < MAX + 5; i++) add(n, `filler ${i}`, 'Ori', []);
    assert(load(n).length === MAX, `capped at ${MAX}`);
    assert(load(n).some(l => l.text.startsWith('A hard-won')), 'the oldest survived because it was the most confirmed');

    // spatial
    clean();
    add(n, 'Cows graze here.', null, [], { x: 100, z: 100 });
    add(n, 'Iron seam here.', null, [], { x: -400, z: -400 });
    const lines = format(n, { x: 105, z: 105 }).split('\n').filter(l => l.startsWith('- '));
    assert(lines[0].includes('Cows'), 'nearest lesson comes first');
    assert(lines[0].includes('7m away'), 'distance shown');

    clean();
    console.log('lessons ok');
}
