import { DisplaySettings, Play } from '../types'

function download(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function slug(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'play'
}

/** Export the live editor SVG as a hi-res PNG. */
export function exportCurrentPlayPNG(play: Play, scale = 3): void {
  const svgEl = document.getElementById('play-svg') as SVGSVGElement | null
  if (!svgEl) return
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  clone.removeAttribute('style')
  clone.removeAttribute('class')
  // strip interactive-only bits (selection rings, handles, hints render fine anyway)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const vb = svgEl.viewBox.baseVal
  const w = vb.width * scale
  const h = vb.height * scale
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  clone.setAttribute('font-family', 'Inter, system-ui, -apple-system, sans-serif')

  const xml = new XMLSerializer().serializeToString(clone)
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      download(url, `${slug(play.name)}.png`)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    }, 'image/png')
  }
  img.src = svgUrl
}

export function exportPlaybookJSON(plays: Play[], display?: DisplaySettings): void {
  const payload = {
    app: 'rally-playbook',
    version: 1,
    exportedAt: new Date().toISOString(),
    display,
    plays,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  download(url, `rally-playbook-${new Date().toISOString().slice(0, 10)}.json`)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function parsePlaybookJSON(text: string): { plays: Play[]; display?: DisplaySettings } {
  const data = JSON.parse(text)
  const plays = Array.isArray(data) ? data : data?.plays
  if (!Array.isArray(plays)) throw new Error('Not a Rally Playbook file')
  for (const p of plays) {
    if (typeof p?.id !== 'string' || !Array.isArray(p?.players) || !Array.isArray(p?.routes)) {
      throw new Error('Not a Rally Playbook file')
    }
  }
  const display = !Array.isArray(data) && data?.display ? (data.display as DisplaySettings) : undefined
  return { plays: plays as Play[], display }
}
