import * as world from './world.js';
import { goToGoal } from './skills.js';
import pf from 'mineflayer-pathfinder';

// civ: bots never left spawn. Every search command is radius-based, and a radius
// is a lie past the simulation distance - nothing spawns out there until someone
// walks over. Travelling needs coordinates they do not have, so an empty search
// read as 'there is no food' rather than 'I am in the wrong place'.
//
// This walks a bounded route in legs, looking around at each stop, and always
// comes back with something to say. A leg that finds nothing is still a finding:
// 'nothing alive 200 blocks east' is worth a lesson and stops the next bot
// repeating the trip.
const LEG = 64;          // pathfinder chokes on one long route; walk it in pieces
const MAX_LEGS = 8;      // 512 blocks, then stop whatever happened
const LOOK = 48;         // what to scan for at each stop

export const HEADINGS = {
    north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
    northeast: [1, -1], northwest: [-1, -1], southeast: [1, 1], southwest: [-1, 1],
};

export function headingVector(direction) {
    const v = HEADINGS[String(direction).toLowerCase().replace(/[^a-z]/g, '')];
    if (!v) return null;
    const len = Math.hypot(v[0], v[1]);
    return [v[0] / len, v[1] / len];
}

// what is worth reporting back from a stop
export function summarise(animals, blocks) {
    const parts = [];
    if (animals.length) parts.push(`animals: ${animals.join(', ')}`);
    if (blocks.length) parts.push(`blocks: ${blocks.join(', ')}`);
    return parts.join('; ');
}

export async function explore(bot, direction, distance = 256, log = () => {}) {
    const dir = headingVector(direction);
    if (!dir) {
        log(bot, `'${direction}' is not a direction. Use north, south, east, west, or a diagonal like northeast.`);
        return false;
    }
    const legs = Math.max(1, Math.min(MAX_LEGS, Math.round(distance / LEG)));
    const start = bot.entity.position.clone();
    const found = [];

    for (let i = 1; i <= legs; i++) {
        if (bot.interrupt_code) break;
        const x = Math.round(start.x + dir[0] * LEG * i);
        const z = Math.round(start.z + dir[1] * LEG * i);
        // civ: this passed y as null to goToPosition, which rejects a null y on its
        // first line and returns false - so every leg of every !explore ever run failed
        // instantly, 129 times in sim 8 alone, and the bots correctly reported that the
        // route failed. That is where sim 7's 'barrier' came from, and Nina drowned
        // going to check it. Travel is an XZ problem; the ground decides the height.
        // goToGoal throws on failure rather than returning false
        let reached = false;
        try { reached = await goToGoal(bot, new pf.goals.GoalNearXZ(x, z, 6)); }
        catch (err) { reached = false; }
        if (!reached) {
            // civ: this used to say 'could not get past', and ten bots turned a lake into
            // a barrier and shouted it to each other as fact. One of them drowned going to
            // look. Say what actually happened - the route failed - and claim nothing about
            // the world.
            log(bot, `Could not find a route ${direction} from x=${x} z=${z} - water, a cliff or a drop, not the edge of anything. Stopped ${i - 1} legs out. Try a different direction or go around.`);
            break;
        }
        const here = bot.entity.position;
        const animals = [...new Set(Object.values(bot.entities)
            .filter(e => e.name && /cow|sheep|pig|chicken|rabbit/.test(e.name)
                && e.position.distanceTo(here) <= LOOK)
            .map(e => e.name))];
        const blocks = world.getNearbyBlockTypes(bot, LOOK)
            .filter(b => /log|wheat|water|coal_ore|iron_ore|hay|sand|bed/.test(b));
        if (animals.length || blocks.length) {
            found.push(`at ${Math.round(here.x)},${Math.round(here.z)} - ${summarise(animals, blocks)}`);
            if (animals.length) {
                log(bot, `Heading ${direction} you found food at ${Math.round(here.x)},${Math.round(here.z)}: ${animals.join(', ')}. Tell the others with !lesson so nobody walks this way blind again.`);
                return true;
            }
        }
    }

    const p = bot.entity.position;
    log(bot, found.length
        ? `Went ${direction} to ${Math.round(p.x)},${Math.round(p.z)}. Found ${found.join(' | ')}. No animals. Worth a !lesson either way.`
        : `Went ${direction} as far as ${Math.round(p.x)},${Math.round(p.z)} and found nothing alive and nothing useful. That is worth recording with !lesson so nobody repeats this trip. Try another direction.`);
    return true;
}

// node src/agent/library/explore.js
if (import.meta.url === `file://${process.argv[1]}`) {
    const assert = (c, m) => { if (!c) throw new Error(m); };
    assert(headingVector('north')[1] === -1, 'north is -z');
    assert(headingVector('EAST ')[0] === 1, 'direction is case and space tolerant');
    const d = headingVector('northeast');
    assert(Math.abs(Math.hypot(d[0], d[1]) - 1) < 1e-9, 'diagonals are normalised, not 1.41x longer');
    assert(headingVector('sideways') === null, 'a bad direction is rejected, not guessed');
    assert(summarise(['cow'], ['oak_log']) === 'animals: cow; blocks: oak_log', 'summary reads both');
    assert(summarise([], []) === '', 'nothing found says nothing');
    console.log('explore ok');
}
