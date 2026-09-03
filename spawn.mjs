// civ: spawn one more bot into the running world. usage: node spawn.mjs profiles/civ/Ivy.json
import { io } from 'socket.io-client';
import fs from 'fs';
import settings from './settings.js';
const profile = JSON.parse(fs.readFileSync(process.argv[2]));
const s = io(`http://localhost:${settings.mindserver_port}`);
s.on('connect', () => s.emit('create-agent', { ...settings, profile }, r => { console.log(r); process.exit(r.success ? 0 : 1); }));
