// civ digest: summarize the last N minutes of chat/deaths + all diaries into digest/<time>.md. usage: node digest.mjs [minutes]
import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import fs from 'fs';
const mins = process.argv[2] || 20;
const key = JSON.parse(fs.readFileSync('keys.json')).ANTHROPIC_API_KEY;
const chat = execSync(`docker logs mc --since ${mins}m 2>&1 | grep -E '<|died|was |fell|blew|joined|left' | tail -400`).toString();
const diaries = fs.readdirSync('bots').filter(n => fs.existsSync(`bots/${n}/memory.json`))
  .map(n => `${n}: ${JSON.parse(fs.readFileSync(`bots/${n}/memory.json`)).memory || ''}`).join('\n');
const client = new Anthropic({ apiKey: key, defaultHeaders: { 'anthropic-workspace-id': 'wrkspc_01NSWFGYX5DnGBAanjkuu2xG' } });
const r = await client.messages.create({ model: 'claude-sonnet-5', max_tokens: 1500, messages: [{ role: 'user', content:
`10 AI agents live in a Minecraft world. Below is the last ${mins} minutes of public chat and deaths, then each agent's private diary.
First, for each agent, read its !goal lines and actions and name in 1-3 words what it has actually been doing (free-form, no preset list, e.g. 'lumber', 'tool broker', 'wandering', 'nothing'). Then write a digest, max 15 lines: what happened, alliances, betrayals, deaths, who did what job, and 1-3 moments worth filming (with names and approximate time). Be concrete, no filler. If nothing happened, say so in one line.

CHAT/DEATHS:\n${chat || '(none)'}\n\nDIARIES:\n${diaries}` }] });
fs.mkdirSync('digest', { recursive: true });
const f = `digest/${new Date().toISOString().slice(0, 16).replace('T', '-')}.md`;
fs.writeFileSync(f, r.content.find(c => c.type === 'text')?.text || '');
console.log('wrote', f, 'tokens', r.usage.input_tokens, r.usage.output_tokens);
