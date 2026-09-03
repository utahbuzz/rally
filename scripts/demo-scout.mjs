// Demo: opponent scout cards via create_custom_play — a Wing-T team's core
// run series drawn from explicit player placement, the way a scout team
// coordinator would card them up.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const OUT = process.argv[2] ?? 'scout-cards.json'
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'mcp/server.ts'],
  env: { ...process.env, PLAYCALLER_PLAYBOOK: OUT },
})
const client = new Client({ name: 'scout-demo', version: '0.0.1' })
await client.connect(transport)

// Wing-T base alignment: 100 formation, wingback right, split end left
const WING_T = [
  { label: 'SE', team: 'O', x_yards: 12, depth_yards: 0 },
  { label: 'LT', team: 'O', x_yards: 22, depth_yards: 0 },
  { label: 'LG', team: 'O', x_yards: 24.3, depth_yards: 0 },
  { label: 'C', team: 'O', x_yards: 26.65, depth_yards: 0 },
  { label: 'RG', team: 'O', x_yards: 29, depth_yards: 0 },
  { label: 'RT', team: 'O', x_yards: 31.3, depth_yards: 0 },
  { label: 'TE', team: 'O', x_yards: 33.6, depth_yards: 0 },
  { label: 'QB', team: 'O', x_yards: 26.65, depth_yards: 1.5 },
  { label: 'WB', team: 'O', x_yards: 34.8, depth_yards: 1.5 },
  { label: 'FB', team: 'O', x_yards: 26.65, depth_yards: 4 },
  { label: 'HB', team: 'O', x_yards: 21.5, depth_yards: 4.5 },
]

const CARDS = [
  {
    name: 'Scout 1 — Buck Sweep Rt',
    notes: 'Their bread and butter. Both guards pull right, WB down-blocks, HB takes the sweep off tackle. FB fills for the backside guard.',
    assignments: [
      { player: 'LG', custom_path: [{ x: 2, y: -0.5 }, { x: 9, y: 0 }, { x: 11, y: 2 }], kind: 'block', color: 'black' },
      { player: 'RG', custom_path: [{ x: 3, y: 0.5 }, { x: 7, y: 2 }], kind: 'block', color: 'black' },
      { player: 'WB', custom_path: [{ x: -1, y: 1.5 }], kind: 'block', color: 'black' },
      { player: 'TE', custom_path: [{ x: 0.5, y: 1.5 }], kind: 'block', color: 'black' },
      { player: 'FB', custom_path: [{ x: -1.5, y: 3 }], kind: 'block', color: 'orange' },
      { player: 'HB', custom_path: [{ x: 4, y: -1 }, { x: 12, y: -0.5 }, { x: 16, y: 6 }], color: 'red' },
      { player: 'QB', custom_path: [{ x: -3, y: -2 }], kind: 'motion', color: 'blue' },
    ],
  },
  {
    name: 'Scout 2 — FB Trap',
    notes: 'Off the same look. Backside guard pulls to trap the 3-tech; FB hits the A-gap NOW. Watch for it when our tackles get upfield.',
    assignments: [
      { player: 'RG', custom_path: [{ x: -2, y: 0.5 }, { x: -4, y: 1.5 }], kind: 'block', color: 'black' },
      { player: 'LG', custom_path: [{ x: 0.5, y: 2 }], kind: 'block', color: 'black' },
      { player: 'C', custom_path: [{ x: -1, y: 1.5 }], kind: 'block', color: 'black' },
      { player: 'FB', custom_path: [{ x: -1.5, y: 5 }], color: 'red' },
      { player: 'HB', custom_path: [{ x: 6, y: -0.5 }, { x: 14, y: 1 }], kind: 'motion', color: 'blue' },
      { player: 'QB', custom_path: [{ x: -3, y: -2 }], kind: 'motion', color: 'blue' },
    ],
  },
  {
    name: 'Scout 3 — Waggle Rt',
    notes: 'Play-action off buck sweep. QB boots right behind both pulling guards; TE crosses at 12, FB slips to the flat, SE goes deep post. Contain is everything.',
    assignments: [
      { player: 'LG', custom_path: [{ x: 2, y: -0.5 }, { x: 9, y: 0 }], kind: 'block', color: 'black' },
      { player: 'RG', custom_path: [{ x: 3, y: 0.5 }, { x: 6, y: 1 }], kind: 'block', color: 'black' },
      { player: 'HB', custom_path: [{ x: 4, y: -1 }, { x: 12, y: -0.5 }], kind: 'motion', color: 'blue' },
      { player: 'QB', custom_path: [{ x: -2, y: -2 }, { x: 4, y: -2.5 }, { x: 9, y: -1 }], color: 'red' },
      { player: 'FB', custom_path: [{ x: 5, y: 1 }, { x: 10, y: 2 }], color: 'green' },
      { player: 'TE', custom_path: [{ x: 0, y: 4 }, { x: -12, y: 10 }], color: 'purple' },
      { player: 'SE', custom_path: [{ x: 0, y: 9 }, { x: 5, y: 14 }], color: 'orange' },
    ],
  },
]

for (const card of CARDS) {
  const res = await client.callTool({
    name: 'create_custom_play',
    arguments: { ...card, players: WING_T, tags: ['Scout', 'Wing-T'] },
  })
  console.log(res.content[0].text.split('.')[0])
}
await client.close()
console.log('DONE →', OUT)
