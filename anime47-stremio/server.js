// anime47-stremio/server.js — Stremio addon for anime47.best
// Node 18+ (native fetch), stdlib only, no dependencies.
//
// Install URL (credentials from env):   http://HOST:PORT/manifest.json
// Install URL (credentials in URL):     http://HOST:PORT/cfg/EMAIL/PASSWORD/manifest.json
//
// ponytail: only jwplayer/vlogphim streams are resolved; hydrax "direct"/embed
// servers are skipped. Upgrade: resolve hydrax if FE ever disappears.

const http = require('http');

const API = 'https://anime47.love/api';
const FRONT = 'https://anime47.best';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const HDRS = { 'User-Agent': UA, 'Referer': FRONT + '/', 'Origin': FRONT, 'Accept': 'application/json, text/plain, */*' };

const MANIFEST = {
    id: 'community.anime47',
    version: '1.0.0',
    name: 'Anime47',
    description: 'Anime vietsub từ anime47.best (cần tài khoản)',
    logo: 'https://raw.githubusercontent.com/paparei/Vbook_extension/main/anime47/icon.png',
    background: 'https://raw.githubusercontent.com/paparei/Vbook_extension/main/anime47/icon.png',
    types: ['series'],
    idPrefixes: ['a47:'],
    resources: ['catalog', 'meta', 'stream', 'subtitles'],
    catalogs: [
        { type: 'series', id: 'a47-latest', name: 'Anime47 • Mới cập nhật' },
        { type: 'series', id: 'a47-search', name: 'Anime47 • Tìm kiếm', extra: [{ name: 'search', isRequired: true }] }
    ],
    behaviorHints: { configurable: false, configurationRequired: false }
};

// ---- auth: one session per email, token cached, re-login once on 401 ----
const sessions = new Map();

async function login(email, password) {
    try {
        const r = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, HDRS),
            body: JSON.stringify({ login: email, password: password, remember: true })
        });
        const j = await r.json().catch(function () { return null; });
        const d = (j && j.data) || j || {};
        return (d.access_token || d.accessToken || d.token || '') + '';
    } catch (e) { return ''; }
}

function getSession(email, password) {
    const key = email + '|' + password;
    if (!sessions.has(key)) {
        const s = { token: '' };
        s.api = async function (path) {
            if (!s.token) s.token = await login(email, password);
            let r = await apiFetch(path, s.token);
            if (r.status === 401) { // stale token: re-login once
                s.token = await login(email, password);
                r = await apiFetch(path, s.token);
            }
            if (!r.ok) return null;
            return r.json().catch(function () { return null; });
        };
        sessions.set(key, s);
    }
    return sessions.get(key);
}

async function apiFetch(path, token) {
    const h = Object.assign({}, HDRS);
    if (token) h['Authorization'] = 'Bearer ' + token;
    return fetch(API + path, { headers: h });
}

// ---- helpers ----
function toPreview(it) {
    if (!it || !it.id || !it.title) return null;
    return {
        id: 'a47:' + it.id,
        type: 'series',
        name: it.title + '',
        poster: (it.poster || it.image || '') + '',
        description: (it.status || it.type || '') + ''
    };
}

// vlogphim master playlists have no extension: fetch, take first variant,
// caller appends ".m3u8" (server accepts it) — same trick as the VBook track.js
async function resolveVariant(masterUrl) {
    try {
        const r = await fetch(masterUrl, { headers: HDRS });
        const text = await r.text();
        if (text.indexOf('#EXTM3U') === -1) return '';
        const origin = (masterUrl.match(/^https?:\/\/[^\/]+/) || [''])[0];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.charAt(0) === '#') continue;
            if (/^https?:\/\//.test(line)) return line;
            return origin + (line.charAt(0) === '/' ? line : '/' + line);
        }
    } catch (e) { }
    return '';
}

async function watchPayload(s, epId) {
    const j = await s.api('/anime/watch/episode/' + epId);
    const d = (j && j.data) || j;
    return (d && d.streams) ? d : { streams: [] };
}

// ---- handlers ----
async function catalog(s, id, q) {
    let posts = [];
    if (id === 'a47-search') {
        const kw = q.get('search') || '';
        if (!kw) return { metas: [] };
        const j = await s.api('/search/full/?keyword=' + encodeURIComponent(kw) + '&page=1');
        posts = (j && j.results) || [];
    } else {
        const j = await s.api('/anime/filter?sort=latest&page=1');
        const d = (j && j.data) || j || {};
        posts = d.posts || [];
        // Stremio paginates with skip; filter API is page-based
        const perPage = (d.pagination && d.pagination.per_page) || posts.length || 24;
        const page = Math.floor((parseInt(q.get('skip') || '0', 10) || 0) / perPage) + 1;
        if (page > 1) {
            const j2 = await s.api('/anime/filter?sort=latest&page=' + page);
            posts = (((j2 && j2.data) || j2) || {}).posts || [];
        }
    }
    return { metas: posts.map(toPreview).filter(Boolean) };
}

async function meta(s, animeId) {
    const j = await s.api('/anime/info/' + animeId);
    const d = (j && j.data) || j;
    if (!d || !d.title) return { meta: null };

    const ej = await s.api('/anime/' + animeId + '/episodes');
    const teams = (((ej && ej.data) || ej) || {}).teams || [];
    const videos = [];
    const seen = {};
    for (const t of teams) {
        for (const g of (t.groups || [])) {
            for (const e of (g.episodes || [])) {
                const n = parseInt(e.number, 10) || (videos.length + 1);
                if (!e.id || seen[n]) continue; // same ep from another fansub team
                seen[n] = 1;
                videos.push({
                    id: 'a47:' + animeId + ':' + e.id,
                    season: 1,
                    episode: n,
                    title: (e.title || ('Tập ' + n)) + ''
                });
            }
        }
    }
    videos.sort(function (a, b) { return a.episode - b.episode; });

    const epTotal = d.episodes && typeof d.episodes === 'object' ? d.episodes.total : d.episodes;
    return {
        meta: {
            id: 'a47:' + animeId,
            type: 'series',
            name: d.title + '',
            poster: (d.poster || d.image || '') + '',
            background: (d.cover || d.poster || '') + '',
            description: ((d.description || d.synopsis || '') + '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            releaseInfo: (d.year || '') + '',
            genres: (d.genres || []).map(function (g) { return typeof g === 'string' ? g : (g.name || ''); }).filter(Boolean),
            videos: videos,
            links: [],
            runtime: null,
            status: (d.status || '') + '',
            totalEpisodes: epTotal || videos.length
        }
    };
}

async function streams(s, epId) {
    const d = await watchPayload(s, epId);
    const out = [];
    for (const st of d.streams) {
        if (!st || !st.url || (st.player_type || '') !== 'jwplayer') continue;
        const variant = await resolveVariant(st.url + '');
        if (!variant) continue;
        out.push({
            name: 'Anime47 • ' + (st.server_name || 'HLS') + (st.quality ? (' ' + st.quality) : ''),
            title: ((st.quality || 'HLS') + ' | ' + (st.server_name || 'FE')),
            url: variant + '.m3u8',
            // cdn*.nonprofit.asia rejects segments without this Referer (403)
            behaviorHints: {
                notWebReady: true,
                proxyHeaders: { request: { 'Referer': FRONT + '/', 'Origin': FRONT, 'User-Agent': UA } }
            }
        });
    }
    return { streams: out };
}

async function subtitles(s, epId) {
    const d = await watchPayload(s, epId);
    const out = [];
    const seen = {};
    // aggregate across servers (site's CC menu does the same), default first
    const subs = [];
    for (const st of d.streams) {
        for (const sub of (st.subtitles || [])) {
            if (!sub || !sub.file || seen[sub.file]) continue;
            seen[sub.file] = 1;
            subs.push(sub);
        }
    }
    subs.sort(function (a, b) { return (b['default'] ? 1 : 0) - (a['default'] ? 1 : 0); });
    for (const sub of subs) {
        const m = (sub.file + '').match(/\.([a-z]{2}(?:-[a-z0-9]+)?)\.vtt/i);
        out.push({
            id: sub.file + '',
            url: sub.file + '',
            lang: ((sub.label || (m ? m[1] : 'Sub')) + (sub['default'] ? ' ★' : ''))
        });
    }
    return { subtitles: out };
}

// ---- http server / routing ----
function send(res, code, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

const server = http.createServer(async function (req, res) {
    try {
        const u = new URL(req.url, 'http://localhost');
        let parts = u.pathname.split('/').filter(Boolean);

        let email = process.env.A47_EMAIL || '';
        let password = process.env.A47_PASSWORD || '';
        if (parts[0] === 'cfg') {
            email = decodeURIComponent(parts[1] || '');
            password = decodeURIComponent(parts[2] || '');
            parts = parts.slice(3);
        }

        const route = parts.join('/');

        if (route === '' ) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h3>Anime47 Stremio addon</h3><p>Install URL: <code>' +
                (email ? u.origin + '/manifest.json' : u.origin + '/cfg/EMAIL/PASSWORD/manifest.json') +
                '</code></p>');
            return;
        }
        if (route === 'manifest.json') return send(res, 200, MANIFEST);

        if (!email || !password) return send(res, 400, { error: 'missing credentials: use /cfg/EMAIL/PASSWORD/... or A47_EMAIL/A47_PASSWORD env' });
        const s = getSession(email, password);

        let m = route.match(/^catalog\/series\/([^\/]+)\.json$/);
        if (m) return send(res, 200, await catalog(s, m[1], u.searchParams));

        m = route.match(/^meta\/series\/a47:(\d+)\.json$/);
        if (m) return send(res, 200, await meta(s, m[1]));

        m = route.match(/^stream\/series\/a47:\d+:(\d+)\.json$/);
        if (m) return send(res, 200, await streams(s, m[1]));

        m = route.match(/^subtitles\/series\/a47:\d+:(\d+)\.json$/);
        if (m) return send(res, 200, await subtitles(s, m[1]));

        return send(res, 404, { error: 'not found: ' + route });
    } catch (e) {
        return send(res, 500, { error: String(e && e.message || e) });
    }
});

const PORT = parseInt(process.env.PORT || '7000', 10);
server.listen(PORT, function () {
    console.log('anime47 stremio addon on http://localhost:' + PORT + '/manifest.json');
});
