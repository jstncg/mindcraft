// civ: decide what an idle bot needs. A bot whose goal stalled out (the self-prompt
// loop gave up) still holds the prompt, so re-asking for a goal made it goal-shop
// every 2 min. Resume the stalled goal twice, then let it choose a new one.
// State lives on the agent: { idleMin, resumes }.
export const IDLE_MIN = 2;
export const MAX_RESUMES = 2;

export function nextNudge({ stopped, prompt, idleMin = 0, resumes = 0 }) {
    if (!stopped) return { idleMin: 0, resumes: 0, act: null };
    idleMin += 1;
    if (idleMin < IDLE_MIN) return { idleMin, resumes, act: null };
    if (prompt && resumes < MAX_RESUMES) return { idleMin: 0, resumes: resumes + 1, act: 'resume' };
    return { idleMin: 0, resumes, act: 'ask' };
}

// node src/agent/nudge.js
if (import.meta.url === `file://${process.argv[1]}`) {
    const assert = (c, m) => { if (!c) throw new Error(m); };
    let s = { idleMin: 0, resumes: 0 };
    const step = (stopped, prompt) => (s = nextNudge({ stopped, prompt, ...s })).act;

    assert(step(false, '') === null, 'active bot is never nudged');
    assert(step(true, '') === null, 'one idle minute is not enough');
    assert(step(true, '') === 'ask', 'goalless bot is asked for a goal');
    // a bot that set a goal, then stalled: resume it, do not re-ask
    assert(step(false, 'build a wall') === null, 'goal running');
    assert(step(true, 'build a wall') === null && step(true, 'build a wall') === 'resume', 'stalled goal resumes');
    assert(step(true, 'build a wall') === null && step(true, 'build a wall') === 'resume', 'second resume');
    assert(step(true, 'build a wall') === null && step(true, 'build a wall') === 'ask', 'gives up after 2 resumes');
    assert(step(false, 'new goal') === null && s.resumes === 0, 'a running goal clears the resume count');
    console.log('nudge ok');
}
