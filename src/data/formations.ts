import { FIELD, Player, Team, uid } from '../types'

const BX = FIELD.BALL_X

function P(team: Team, label: string, x: number, y: number, shape?: Player['shape']): Player {
  return {
    id: uid(),
    team,
    label,
    x,
    y,
    shape: shape ?? (team === 'O' ? 'circle' : 'text'),
  }
}

/** Standard offensive line, centers 1.2yd apart, just behind the LOS line */
function oline(): Player[] {
  const y = 272
  return [
    P('O', 'LT', BX - 48, y),
    P('O', 'LG', BX - 24, y),
    P('O', 'C', BX, y, 'square'),
    P('O', 'RG', BX + 24, y),
    P('O', 'RT', BX + 48, y),
  ]
}

export interface FormationDef {
  name: string
  team: Team
  players: () => Player[]
}

export const OFFENSE_FORMATIONS: FormationDef[] = [
  {
    name: 'Gun Spread (2x2)',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 322),
      P('O', 'RB', BX + 38, 328),
      P('O', 'X', 80, 274),
      P('O', 'H', 168, 284),
      P('O', 'Y', 365, 274),
      P('O', 'Z', 453, 284),
    ],
  },
  {
    name: 'Gun Trips Rt',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 322),
      P('O', 'RB', BX - 38, 328),
      P('O', 'X', 80, 274),
      P('O', 'H', 330, 284),
      P('O', 'Y', 390, 274),
      P('O', 'Z', 453, 284),
    ],
  },
  {
    name: 'Gun Empty (3x2)',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 322),
      P('O', 'X', 80, 274),
      P('O', 'H', 162, 284),
      P('O', 'W', 340, 284),
      P('O', 'Y', 398, 274),
      P('O', 'Z', 455, 284),
    ],
  },
  {
    name: 'Gun Bunch Rt',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 322),
      P('O', 'RB', BX - 38, 328),
      P('O', 'X', 88, 274),
      P('O', 'Y', 382, 274),
      P('O', 'H', 356, 288),
      P('O', 'Z', 408, 288),
    ],
  },
  {
    name: 'Singleback 11',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 292),
      P('O', 'RB', BX, 332),
      P('O', 'Y', BX + 74, 272),
      P('O', 'X', 84, 274),
      P('O', 'H', 172, 284),
      P('O', 'Z', 445, 284),
    ],
  },
  {
    name: 'Pistol 11',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 312),
      P('O', 'RB', BX, 340),
      P('O', 'Y', BX + 74, 272),
      P('O', 'X', 84, 274),
      P('O', 'H', 172, 284),
      P('O', 'Z', 445, 284),
    ],
  },
  {
    name: 'I-Form 21',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 292),
      P('O', 'FB', BX, 312),
      P('O', 'RB', BX, 340),
      P('O', 'Y', BX + 74, 272),
      P('O', 'X', 84, 274),
      P('O', 'Z', 445, 284),
    ],
  },
  {
    name: 'Ace 12 (2TE)',
    team: 'O',
    players: () => [
      ...oline(),
      P('O', 'QB', BX, 292),
      P('O', 'RB', BX, 334),
      P('O', 'Y', BX + 74, 272),
      P('O', 'U', BX - 74, 272),
      P('O', 'X', 84, 274),
      P('O', 'Z', 445, 284),
    ],
  },
]

export const DEFENSE_FORMATIONS: FormationDef[] = [
  {
    name: '4-3 Over',
    team: 'D',
    players: () => [
      P('D', 'E', BX - 62, 246),
      P('D', 'T', BX - 14, 246),
      P('D', 'T', BX + 34, 246),
      P('D', 'E', BX + 62, 246),
      P('D', 'W', BX - 52, 206),
      P('D', 'M', BX, 206),
      P('D', 'S', BX + 56, 210),
      P('D', 'C', 102, 226),
      P('D', 'C', 434, 226),
      P('D', 'FS', BX - 30, 118),
      P('D', 'SS', BX + 80, 142),
    ],
  },
  {
    name: '3-4 Base',
    team: 'D',
    players: () => [
      P('D', 'E', BX - 50, 246),
      P('D', 'N', BX, 246),
      P('D', 'E', BX + 50, 246),
      P('D', 'J', BX - 86, 238),
      P('D', 'W', BX - 26, 206),
      P('D', 'M', BX + 26, 206),
      P('D', 'B', BX + 86, 238),
      P('D', 'C', 102, 226),
      P('D', 'C', 434, 226),
      P('D', 'FS', BX - 30, 118),
      P('D', 'SS', BX + 80, 142),
    ],
  },
  {
    name: 'Nickel 4-2-5',
    team: 'D',
    players: () => [
      P('D', 'E', BX - 62, 246),
      P('D', 'T', BX - 14, 246),
      P('D', 'T', BX + 34, 246),
      P('D', 'E', BX + 62, 246),
      P('D', 'W', BX - 32, 206),
      P('D', 'M', BX + 32, 206),
      P('D', 'N', 170, 224),
      P('D', 'C', 102, 230),
      P('D', 'C', 434, 230),
      P('D', 'FS', BX - 66, 122),
      P('D', 'SS', BX + 66, 122),
    ],
  },
  {
    name: 'Cover 3 Sky',
    team: 'D',
    players: () => [
      P('D', 'E', BX - 62, 246),
      P('D', 'T', BX - 14, 246),
      P('D', 'T', BX + 34, 246),
      P('D', 'E', BX + 62, 246),
      P('D', 'W', BX - 52, 206),
      P('D', 'M', BX, 206),
      P('D', 'S', BX + 56, 210),
      P('D', 'C', 100, 190),
      P('D', 'C', 435, 190),
      P('D', 'FS', BX, 105),
      P('D', 'SS', BX + 110, 168),
    ],
  },
]

export function findFormation(team: Team, name: string): FormationDef | undefined {
  const list = team === 'O' ? OFFENSE_FORMATIONS : DEFENSE_FORMATIONS
  return list.find((f) => f.name === name)
}
