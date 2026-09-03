// Serves the built Playcaller app at a public URL.
// The single-file build is committed to the (public) repo; this function
// proxies and caches it, so shipping a new app version is just a git push.
const SOURCE =
  'https://raw.githubusercontent.com/utahbuzz/rally/claude/football-play-design-app-9alzwa/hosting/index.html'

let cache: { html: string; at: number } | null = null

Deno.serve(async () => {
  try {
    if (!cache || Date.now() - cache.at > 60_000) {
      const res = await fetch(SOURCE)
      if (!res.ok) throw new Error(`upstream ${res.status}`)
      cache = { html: await res.text(), at: Date.now() }
    }
  } catch (_e) {
    if (!cache) {
      return new Response('Playcaller is momentarily unavailable — refresh in a minute.', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      })
    }
  }
  return new Response(cache.html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
  })
})
