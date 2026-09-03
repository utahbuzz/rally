/**
 * Team packs: a program's own formations and terminology, loaded from a
 * private JSON file rather than committed to this (public) repo.
 *
 * Set PLAYCALLER_TEAM_PACK=/path/to/pack.json. A pack teaches the MCP
 * server the staff's formation names and call grammar, so generated plays
 * read like their playbook instead of generic football.
 */
import { existsSync, readFileSync } from 'node:fs'
import { FIELD, Player, Team, uid } from '../src/types'
import { spotFromMid } from '../src/utils/field'

export interface PackPlayer {
  label: string
  team?: Team
  /** distance from the left sideline, in yards, as if the ball were at midfield */
  x_yards: number
  /** distance from the line of scrimmage, in yards */
  depth_yards: number
}

export interface PackFormation {
  name: string
  team?: Team
  /** false = alignment inferred from convention and still needs staff sign-off */
  confirmed?: boolean
  note?: string
  players: PackPlayer[]
}

export interface TeamPack {
  team: string
  call_grammar?: string
  notes?: string
  /** e.g. { "Pass protections": ["Solo", "Rip/Liz"], ... } */
  terminology?: Record<string, string[]>
  formations: PackFormation[]
  /** formation names the staff still needs to supply alignments for */
  needs_alignment?: string[]
}

let cached: TeamPack | null | undefined

export function loadTeamPack(): TeamPack | null {
  if (cached !== undefined) return cached
  const path = process.env.PLAYCALLER_TEAM_PACK
  if (!path || !existsSync(path)) {
    cached = null
    return cached
  }
  try {
    const pack = JSON.parse(readFileSync(path, 'utf8')) as TeamPack
    cached = Array.isArray(pack?.formations) ? pack : null
  } catch {
    cached = null
  }
  return cached
}

export function findPackFormation(name: string): PackFormation | undefined {
  const pack = loadTeamPack()
  if (!pack) return undefined
  const want = name.trim().toLowerCase()
  return pack.formations.find((f) => f.name.trim().toLowerCase() === want)
}

/** Build field players for a pack formation, spotted at the given ball x. */
export function packFormationPlayers(f: PackFormation, ballX: number): Player[] {
  return f.players.map((p) => {
    const team: Team = p.team ?? f.team ?? 'O'
    const label = p.label.toUpperCase()
    return {
      id: uid(),
      team,
      label,
      x: Math.min(Math.max(spotFromMid(p.x_yards * 10, ballX), 8), FIELD.W - 8),
      y:
        team === 'O'
          ? Math.min(FIELD.LOS + 10 + p.depth_yards * 10, FIELD.H - 10)
          : Math.max(FIELD.LOS - 12 - p.depth_yards * 10, 10),
      shape: team === 'D' ? 'text' : label === 'C' ? 'square' : 'circle',
    }
  })
}
