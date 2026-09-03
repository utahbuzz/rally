// End-to-end test of the Playcaller MCP server over stdio,
// exercising it the way an MCP client (Claude) would.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { readFileSync, rmSync } from 'node:fs'

const PLAYBOOK = 'test-playbook.json'
rmSync(PLAYBOOK, { force: true })

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'mcp/server.ts'],
  env: { ...process.env, PLAYCALLER_PLAYBOOK: PLAYBOOK },
})
const client = new Client({ name: 'test', version: '0.0.1' })
await client.connect(transport)

const tools = await client.listTools()
console.log('tools:', tools.tools.map((t) => t.name).join(', '))

const guide = await client.callTool({ name: 'coverage_guide', arguments: { coverage: 'Cover 2' } })
console.log('coverage_guide ok:', guide.content[0].text.includes('honey hole'))

// Smash concept vs cover 2 — the classic
const created = await client.callTool({
  name: 'create_play',
  arguments: {
    name: 'Trips Rt — Smash',
    offense_formation: 'Gun Trips Rt',
    defense_formation: 'Nickel 4-2-5',
    tags: ['Pass', 'vs Cover 2'],
    notes: 'Corner over Hitch. QB reads the squat corner: he sinks → throw the hitch, he squats → corner.',
    assignments: [
      { player: 'Z', route: 'Corner', color: 'red' },
      { player: 'Y', route: 'Hitch', color: 'blue' },
      { player: 'H', route: 'Flat', color: 'green' },
      { player: 'X', route: 'Dig', color: 'purple' },
      { player: 'RB', route: 'Swing', color: 'orange' },
      { player: 'LT', route: 'Pass Pro', color: 'black' },
      { player: 'LG', route: 'Pass Pro', color: 'black' },
      { player: 'C', route: 'Pass Pro', color: 'black' },
      { player: 'RG', route: 'Pass Pro', color: 'black' },
      { player: 'RT', route: 'Pass Pro', color: 'black' },
    ],
  },
})
console.log('create_play:', created.content[0].text)

// custom path + error handling
const custom = await client.callTool({
  name: 'create_play',
  arguments: {
    name: 'Custom Path Test',
    offense_formation: 'Gun Spread (2x2)',
    assignments: [
      { player: 'X', custom_path: [{ x: 0, y: 5 }, { x: -4, y: 9 }], color: 'blue' },
      { player: 'NOPE', route: 'Go' },
      { player: 'Z', route: 'NotARoute' },
    ],
  },
})
console.log('create_play custom:', custom.content[0].text)

const list = await client.callTool({ name: 'list_plays', arguments: {} })
console.log('list_plays:\n' + list.content[0].text)

const del = await client.callTool({ name: 'delete_play', arguments: { name: 'Custom Path Test' } })
console.log('delete_play:', del.content[0].text)

// Validate the file matches the app's import expectations (parsePlaybookJSON)
const data = JSON.parse(readFileSync(PLAYBOOK, 'utf8'))
const plays = data.plays
const valid =
  Array.isArray(plays) &&
  plays.every((p) => typeof p.id === 'string' && Array.isArray(p.players) && Array.isArray(p.routes))
console.log('file valid for app import:', valid, '| plays:', plays.length, '| players in play 1:', plays[0].players.length, '| routes:', plays[0].routes.length)

rmSync(PLAYBOOK, { force: true })
await client.close()
