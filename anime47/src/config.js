var BASE_URL = 'https://anime47.best';
var API_URL = 'https://anime47.love/api';

var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

// plugin.json.config keys are injected as globals by VBook: a47_email, a47_password
function configText(name) {
    try {
        var raw = this[name];
        raw = raw === undefined || raw === null ? '' : String(raw);
        return raw.replace(/"/g, '').trim();
    } catch (e) {
        return '';
    }
}

function storageGet(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
}

function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
}

function postJson(url, body) {
    var res;
    try {
        res = fetch(url, {
            method: 'POST',
            headers: {
                'User-Agent': UA,
                'Referer': BASE_URL + '/',
                'Origin': BASE_URL,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify(body),
            timeout: 15000
        });
    } catch (e) { return null; }
    if (!res || !res.text) return null;
    try { return JSON.parse(res.text()); } catch (e) { return null; }
}

function tokensFrom(j) {
    if (!j) return null;
    var d = j.data || j;
    var token = d.access_token || d.accessToken || d.token || '';
    if (!token) return null;
    return { token: token + '', refresh: (d.refresh_token || d.refreshToken || '') + '' };
}

function doLogin(email, password) {
    return tokensFrom(postJson(API_URL + '/auth/login', { login: email, password: password, remember: true }));
}

function doRefresh(refresh) {
    return tokensFrom(postJson(API_URL + '/auth/refresh-token', { refresh_token: refresh }));
}

// Site is PRIVATE_MODE: detail/episodes/watch endpoints need a Bearer token.
function getAccessToken() {
    var token = storageGet('a47_token');
    if (token) return token;
    var t = null;
    var refresh = storageGet('a47_refresh');
    if (refresh) t = doRefresh(refresh);
    if (!t) {
        var email = configText('a47_email');
        var password = configText('a47_password');
        if (email && password) t = doLogin(email, password);
    }
    if (t) {
        storageSet('a47_token', t.token);
        if (t.refresh) storageSet('a47_refresh', t.refresh);
        return t.token;
    }
    return '';
}

function fetchApi(url, withAuth) {
    var headers = {
        'User-Agent': UA,
        'Referer': BASE_URL + '/',
        'Origin': BASE_URL,
        'Accept': 'application/json, text/plain, */*'
    };
    if (withAuth !== false) {
        var token = getAccessToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
    }
    try {
        return fetch(url, { headers: headers, timeout: 15000 });
    } catch (e) { return null; }
}

function fetchJson(url, withAuth) {
    var res = fetchApi(url, withAuth);
    if (res && res.status === 401 && withAuth !== false) {
        // stale token: drop cache, re-login/refresh once
        storageSet('a47_token', '');
        res = fetchApi(url, withAuth);
    }
    if (!res || !res.text) return null;
    try { return JSON.parse(res.text()); } catch (e) { return null; }
}

function fetchHtml(url) {
    var res = fetchApi(url, true);
    if (!res || !res.ok || !res.text) return '';
    return res.text() + '';
}

function normalizeUrl(url) {
    if (!url) return '';
    url = url + '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) return url;
    if (url.indexOf('/') === 0) return BASE_URL + url;
    return BASE_URL + '/' + url;
}

function cleanText(text) {
    if (!text) return '';
    return String(text).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractInitialState(html) {
    if (!html) return null;
    var match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});\s*(?:document\.currentScript\.remove\(\)|<\/script>)/);
    if (match && match[1]) {
        try { return JSON.parse(match[1]); } catch (e) { return null; }
    }
    return null;
}

function findQueryData(state, keyPart) {
    if (!state || !state.queryCache || !state.queryCache.queries) return null;
    var queries = state.queryCache.queries;
    for (var i = 0; i < queries.length; i++) {
        var q = queries[i];
        var qKey = (q.queryKey && q.queryKey.join) ? q.queryKey.join(',') : '';
        if (qKey.indexOf(keyPart) !== -1 && q.state && q.state.data) {
            return q.state.data.data || q.state.data;
        }
    }
    return null;
}

// Maps both SSR items (image/link) and /anime/filter posts (poster/slug) to a list item.
function toItem(it) {
    if (!it) return null;
    var link = it.link || (it.id ? ('/phim/' + (it.slug || ('anime-' + it.id)) + '/m' + it.id + '.html') : '');
    var ep = it.current_episode ? ('Tập ' + it.current_episode) : '';
    var name = (it.title || it.name || '') + '';
    if (!name) return null;
    return {
        name: name,
        link: normalizeUrl(link),
        cover: (it.poster || it.image || it.poster_url || it.thumbnail || '') + '',
        description: ep || (it.status || it.type || '') + '',
        host: BASE_URL
    };
}
