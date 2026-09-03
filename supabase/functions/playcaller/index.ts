// Redirects to the hosted Playcaller app.
//
// Why not serve the app from here: Supabase forces
// `content-type: text/plain` plus `content-security-policy: default-src
// 'none'; sandbox` on every HTML response from *.supabase.co (both Edge
// Functions and Storage) as an anti-phishing measure, so a web app can
// never render from a Supabase URL. Verified against the live response.
// The app is served from GitHub Pages instead; this keeps the old link
// working for anyone who saved it.
const APP_URL = 'https://utahbuzz.github.io/rally/'

Deno.serve(() => Response.redirect(APP_URL, 302))
