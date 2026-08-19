# Anime47 — Stremio addon

Stremio version of the anime47.best source (same API as the VBook extension).
Single file, Node 18+, **no dependencies** (stdlib + native fetch).

## Why Stremio
Stremio resolves a fresh signed stream URL per play and retries segments,
which avoids the mid-playback "could not load this server" seen in VBook's
native player (anime47's CDN serves short-lived signed URLs).

## Run
```
node server.js            # http://localhost:7000
```
Credentials via env or in the install URL:
```
A47_EMAIL=you@mail.com A47_PASSWORD=pass node server.js
```

## Install in Stremio
- With env credentials: `http://localhost:7000/manifest.json`
- Or embed credentials: `http://localhost:7000/cfg/EMAIL/PASSWORD/manifest.json`
  (URL-encode the email, e.g. `@` → `%40`)

## Host it (so it works on phone/TV)
Deploy `server.js` anywhere Node runs and set `A47_EMAIL` / `A47_PASSWORD` env vars:
- Render/Railway/Fly.io free tier, or a VPS with `node server.js` behind a reverse proxy.
- Then install `https://YOUR-HOST/manifest.json` in Stremio.

## Features
- Catalog: latest updates + search
- Episodes per anime (deduped across fansub teams)
- Streams: FE/jwplayer HLS, fresh signed URL per play, CDN Referer via `proxyHeaders`
- Subtitles: all external VTT tracks, default (usually Tiếng Việt) first

## Limits
- Only `jwplayer` (vlogphim) servers are resolved; hydrax/embed servers are skipped.
- Credentials in the install URL are visible to whoever hosts/sees the link — prefer env vars on shared hosts.
