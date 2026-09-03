/** How to attack each coverage — shared by the app's AI panel and the MCP server. */
export const COVERAGE_GUIDE: Record<string, string> = {
  'cover 0': 'All-out man, no deep help. Beat it with: quick game (Slant, Hitch) before the blitz arrives, Go routes to your best matchup, RB Swing as a hot outlet, max protect + double moves. Suggested pairing: Gun Spread with Slants + RB Swing; keep 6 in protection on shot plays.',
  'cover 1': 'Man free — one deep safety. Beat it with: crossers and Drags (rubs beat man), Wheel from the backfield, Post to occupy the free safety while a Corner wins outside, Bunch alignments to create natural picks. Suggested: Gun Bunch Rt with a mesh of Drag + Corner + Flat.',
  'cover 2': 'Two deep safeties, corners squat in the flats. Weak spots: the honey hole (deep outside behind the corner, in front of the safety), the deep middle seam, and the flats stretched vertically. Best concepts: Smash (Hitch under + Corner over), Flood (Corner/Out/Flat three-level), 4 Verts (seams split the safeties), and Dig behind the LBs. Suggested: Trips Rt Flood; Gun Spread 4 Verts with seams by H and Y.',
  'cover 3': 'Three deep, four under. Weak spots: the flats and the seams between curl defenders. Best concepts: Curl-Flat combos, Out routes under the deep third, Drive/Dig concepts, Flood to the boundary, RB Swing to stretch the flat defender. Four verts also stresses the middle-third safety with two seams.',
  'cover 4': 'Quarters — four deep, safeties read #2. Weak spots: the flats (only 3 under defenders) and play-action to freeze safeties reading run. Best concepts: Out + Flat combinations, Curl-Flat, deep Post off play-action when safeties bite, Drag series underneath.',
  'cover 6': 'Quarter-quarter-half — treat the half-field side like Cover 2 (attack the honey hole with Smash/Corner) and the quarters side like Cover 4 (attack the flat).',
  '2-man': 'Two deep, man under with trail technique. Beat it with: Wheel and crossing routes that outrun trailers, back-shoulder Go balls, RB matchups on LBs, rub concepts from Bunch. Avoid: comeback routes into trail leverage.',
  'man press': 'Press man at the line. Beat it with: Slants off a quick release, Fade/Go when you win off the line, rub/pick concepts from stacked or Bunch alignments, Drag mesh underneath, motion to identify man and create a running start. Short yardage: Slant + Flat rub from Bunch is near-automatic.',
  'blitz': 'Extra rushers, thin coverage behind. Beat it with: hot routes (Slant, quick Flat, RB Swing), screens into the vacated area, max protection with a two-man route of Go + Post at your best matchup.',
}

/** Look up guidance for a loosely-worded coverage name. */
export function coverageGuide(coverage: string): string | null {
  const key = coverage.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
  const match = Object.keys(COVERAGE_GUIDE).find((k) => key.includes(k))
  return match ? COVERAGE_GUIDE[match] : null
}

export const COVERAGE_NAMES = Object.keys(COVERAGE_GUIDE)
