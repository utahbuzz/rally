/**
 * Thin proxy to the Anthropic Messages API for Playcaller's Coach AI panel.
 *
 * It deliberately contains no football logic: the app runs the tool loop in
 * the browser so the AI draws plays through the same formation, route and
 * hash code as the canvas. This function exists only because an API key must
 * not ship in a browser bundle.
 *
 * Key resolution:
 *   1. ANTHROPIC_API_KEY secret on the project, if set
 *   2. otherwise the x-anthropic-key header, which the app fills from a key
 *      the coach pastes into the panel (kept in their browser)
 *
 * Identity-linked keys additionally require naming the workspace the request
 * acts in, so a workspace id from ANTHROPIC_WORKSPACE_ID or the
 * x-anthropic-workspace header is forwarded as anthropic-workspace-id.
 *
 * NOTE: this endpoint is public (no JWT). Setting the project secret means
 * anyone with the URL can spend those API credits, so prefer the per-user
 * key unless the URL stays inside a controlled group.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, apikey, content-type, x-anthropic-key, x-anthropic-workspace',
  'access-control-allow-methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') return json({ error: { message: 'POST only' } }, 405)

  const key = Deno.env.get('ANTHROPIC_API_KEY') ?? req.headers.get('x-anthropic-key') ?? ''
  if (!key) {
    return json(
      { error: { message: 'No Anthropic API key. Paste one in the Coach AI panel, or set the ANTHROPIC_API_KEY secret on this Supabase project.' } },
      400,
    )
  }

  const workspace =
    Deno.env.get('ANTHROPIC_WORKSPACE_ID') ?? req.headers.get('x-anthropic-workspace') ?? ''

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: { message: 'Body must be JSON' } }, 400)
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        ...(workspace ? { 'anthropic-workspace-id': workspace } : {}),
      },
      body: JSON.stringify(body),
    })
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { ...CORS, 'content-type': 'application/json' },
    })
  } catch (e) {
    return json({ error: { message: `Could not reach Anthropic: ${e}` } }, 502)
  }
})
