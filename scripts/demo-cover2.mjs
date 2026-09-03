// Demo: drive the Playcaller MCP server to build a 10-play "Beat Cover 2" pack.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { rmSync } from 'node:fs'

const OUT = process.argv[2] ?? 'beat-cover-2-pack.json'
rmSync(OUT, { force: true })

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'mcp/server.ts'],
  cwd: '/home/user/rally',
  env: { ...process.env, PLAYCALLER_PLAYBOOK: OUT },
})
const client = new Client({ name: 'cover2-demo', version: '0.0.1' })
await client.connect(transport)

const PRO = ['LT', 'LG', 'C', 'RG', 'RT'].map((p) => ({ player: p, route: 'Pass Pro', color: 'black' }))
const D = 'Nickel 4-2-5'
const plays = [
  {
    name: 'Trips Rt — Smash',
    offense_formation: 'Gun Trips Rt',
    notes: 'High-low on the squat corner: Z corner over Y hitch. Corner sinks → hitch now; corner squats → corner in the honey hole.',
    assignments: [
      { player: 'Z', route: 'Corner', color: 'red' },
      { player: 'Y', route: 'Hitch', color: 'blue' },
      { player: 'H', route: 'Flat', color: 'green' },
      { player: 'X', route: 'Dig', color: 'purple' },
      { player: 'RB', route: 'Swing', color: 'orange' },
      ...PRO,
    ],
  },
  {
    name: 'Gun Spread — 4 Verts',
    offense_formation: 'Gun Spread (2x2)',
    notes: 'Seams split the two deep safeties. Read the near safety: he widens → seam behind him; he sits → outside vert 1-on-1.',
    assignments: [
      { player: 'X', route: 'Go', color: 'red' },
      { player: 'H', route: 'Go', color: 'blue' },
      { player: 'Y', route: 'Go', color: 'blue' },
      { player: 'Z', route: 'Go', color: 'red' },
      { player: 'RB', route: 'Swing', color: 'orange' },
      ...PRO,
    ],
  },
  {
    name: 'Trips Rt — Flood',
    offense_formation: 'Gun Trips Rt',
    notes: 'Three-level stretch right: corner deep, out at 10, flat now. The squat corner cannot cover two of them.',
    assignments: [
      { player: 'Z', route: 'Corner', color: 'red' },
      { player: 'Y', route: 'Out', color: 'blue' },
      { player: 'H', route: 'Flat', color: 'green' },
      { player: 'X', route: 'Dig', color: 'purple' },
      { player: 'RB', route: 'Pass Pro', color: 'black' },
      ...PRO,
    ],
  },
  {
    name: 'Gun Spread — Double Smash',
    offense_formation: 'Gun Spread (2x2)',
    notes: 'Smash both sides: corners by the slots over hitches outside. Work the best matchup pre-snap; RB checks then swings.',
    assignments: [
      { player: 'X', route: 'Hitch', color: 'blue' },
      { player: 'H', route: 'Corner', color: 'red' },
      { player: 'Y', route: 'Corner', color: 'red' },
      { player: 'Z', route: 'Hitch', color: 'blue' },
      { player: 'RB', route: 'Swing', color: 'orange' },
      ...PRO,
    ],
  },
  {
    name: 'Singleback 11 — Dagger',
    offense_formation: 'Singleback 11',
    notes: 'H seam clears the middle, X digs in behind the LBs at 15. Hit the dig in the window between hooks.',
    assignments: [
      { player: 'H', route: 'Go', color: 'blue' },
      { player: 'X', route: 'Dig', color: 'red' },
      { player: 'Z', route: 'Curl', color: 'green' },
      { player: 'Y', route: 'Flat', color: 'orange' },
      { player: 'RB', route: 'Pass Pro', color: 'black' },
      ...PRO,
    ],
  },
  {
    name: 'Bunch Rt — Honey Hole Shot',
    offense_formation: 'Gun Bunch Rt',
    notes: 'Y corner to the honey hole behind the squat corner, Z flat holds him low, H drags to pull a hook defender.',
    assignments: [
      { player: 'Y', route: 'Corner', color: 'red' },
      { player: 'Z', route: 'Flat', color: 'green' },
      { player: 'H', route: 'Drag', color: 'purple' },
      { player: 'X', route: 'Go', color: 'blue' },
      { player: 'RB', route: 'Pass Pro', color: 'black' },
      ...PRO,
    ],
  },
  {
    name: 'Gun Empty — Seams & Hitches',
    offense_formation: 'Gun Empty (3x2)',
    notes: 'Both inside slots up the seams; hitches outside vs soft corners. Quick rhythm throw — no back to help in protection.',
    assignments: [
      { player: 'H', route: 'Go', color: 'blue' },
      { player: 'W', route: 'Go', color: 'blue' },
      { player: 'X', route: 'Hitch', color: 'red' },
      { player: 'Z', route: 'Hitch', color: 'red' },
      { player: 'Y', route: 'Flat', color: 'green' },
      ...PRO,
    ],
  },
  {
    name: 'Pistol 11 — PA Post Shot',
    offense_formation: 'Pistol 11',
    notes: 'Play-action freezes the safeties; X post splits the deep half. Y drags underneath as the checkdown.',
    assignments: [
      { player: 'X', route: 'Post', color: 'red' },
      { player: 'H', route: 'Wheel', color: 'blue' },
      { player: 'Y', route: 'Drag', color: 'green' },
      { player: 'Z', route: 'Dig', color: 'purple' },
      { player: 'RB', route: 'Lead', color: 'black' },
      ...PRO,
    ],
  },
  {
    name: 'Trips Rt — Curl-Flat-Seam',
    offense_formation: 'Gun Trips Rt',
    notes: 'H seam holds the safety, Y curl at 12, Z flat stretches the corner. Curl-flat triangle read on the overhang.',
    assignments: [
      { player: 'H', route: 'Go', color: 'blue' },
      { player: 'Y', route: 'Curl', color: 'red' },
      { player: 'Z', route: 'Flat', color: 'green' },
      { player: 'X', route: 'Slant', color: 'purple' },
      { player: 'RB', route: 'Pass Pro', color: 'black' },
      ...PRO,
    ],
  },
  {
    name: 'I-Form — PA Flood Rt',
    offense_formation: 'I-Form 21',
    notes: 'Run fake to RB, FB leaks to the flat, Y corner over him, Z clears deep. Classic three-level off play-action.',
    assignments: [
      { player: 'Z', route: 'Go', color: 'blue' },
      { player: 'Y', route: 'Corner', color: 'red' },
      { player: 'FB', route: 'Flat', color: 'green' },
      { player: 'X', route: 'Dig', color: 'purple' },
      { player: 'RB', route: 'Lead', color: 'black' },
      ...PRO,
    ],
  },
]

for (const p of plays) {
  const res = await client.callTool({
    name: 'create_play',
    arguments: { ...p, defense_formation: D, tags: ['Pass', 'vs Cover 2'] },
  })
  console.log(res.content[0].text.split('.')[0])
}
await client.close()
console.log('DONE →', OUT)
