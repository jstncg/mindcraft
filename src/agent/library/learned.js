import fs from 'fs';

// civ: Voyager's skill library. !newAction already writes working programs - Elias's
// roof, Ren's wall - and coder.js threw every one away, so ten bots re-derived the same
// code all session and nothing compounded. Keep the ones that ran.
//
// This is the one channel where verification actually works: code either lints, executes
// and returns, or it does not. Beliefs about the world need a critic; a program does not.
// Shared across bots on purpose - a skill is knowledge that can be handed over intact.
const DIR = './learned_skills';
const MAX = 60;

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

export function save(description, code, author) {
    const name = slug(description);
    if (!name || !code) return null;
    fs.mkdirSync(DIR, { recursive: true });
    const file = `${DIR}/${name}.json`;
    if (fs.existsSync(file)) return null; // first working version wins; do not churn
    if (fs.readdirSync(DIR).length >= MAX) return null;
    fs.writeFileSync(file, JSON.stringify({ name, description, author, code, t: Date.now() }, null, 2));
    return name;
}

export function all() {
    try {
        return fs.readdirSync(DIR).filter(f => f.endsWith('.json'))
            .map(f => JSON.parse(fs.readFileSync(`${DIR}/${f}`, 'utf8')));
    } catch { return []; }
}

// same shape as getSkillDocs() so it drops straight into the existing SkillLibrary
export function docs() {
    return all().map(s =>
        `// LEARNED by ${s.author}: ${s.description}\n// This ran successfully. Reuse or adapt it.\n${s.code}`);
}

// node src/agent/library/learned.js
if (import.meta.url === `file://${process.argv[1]}`) {
    const assert = (c, m) => { if (!c) throw new Error(m); };
    fs.rmSync(DIR, { recursive: true, force: true });

    assert(all().length === 0 && docs().length === 0, 'starts empty');
    assert(save('Build a flat roof of oak planks', 'await bot.chat("hi")', 'Elias') === 'build_a_flat_roof_of_oak_planks', 'slugged from the description');
    assert(save('Build a flat roof of oak planks', 'different code', 'Ren') === null, 'first working version wins');
    assert(save('', 'code', 'Ada') === null && save('desc', '', 'Ada') === null, 'needs both halves');
    assert(all().length === 1, 'one skill stored');
    const d = docs()[0];
    assert(d.includes('LEARNED by Elias') && d.includes('await bot.chat'), 'doc carries author and code');
    assert(save('Dig a staircase down to y=12', 'await bot.dig()', 'Ori'), 'second skill');
    assert(docs().length === 2, 'both retrievable');

    fs.rmSync(DIR, { recursive: true, force: true });
    console.log('learned ok');
}
