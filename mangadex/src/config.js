var BASE_URL = 'https://mangadex.org';
var API_URL = 'https://api.mangadex.org';
var UPLOADS_URL = 'https://uploads.mangadex.org';
var FORUM_URL = 'https://forums.mangadex.org';
var PAGE_SIZE = 24;
var CHAPTER_PAGE_SIZE = 100;
var LANGUAGE = 'vi,en';
var CONTENT_RATINGS = ['safe', 'suggestive', 'erotica'];
var lastApiError = '';

var lastApiRequestAt = 0;

try {
    if (md_languages) LANGUAGE = String(md_languages);
} catch (e) {}

function languageList() {
    var values = String(LANGUAGE || 'en').split(',');
    var result = [];
    var seen = {};
    for (var i = 0; i < values.length; i++) {
        var value = values[i].replace(/^\s+|\s+$/g, '');
        if (!value || !/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(value) || seen[value]) continue;
        seen[value] = true;
        result.push(value);
    }
    return result.length ? result : ['en'];
}

function buildQuery(pairs) {
    var parts = [];
    for (var i = 0; i < pairs.length; i++) {
        if (pairs[i][1] === undefined || pairs[i][1] === null || pairs[i][1] === '') continue;
        parts.push(encodeURIComponent(pairs[i][0]) + '=' + encodeURIComponent(String(pairs[i][1])));
    }
    return parts.join('&');
}

function isTransientStatus(status) {
    return !status || status === 408 || status === 429 || (status >= 500 && status < 600);
}

function cacheKey(url) {
    return 'md_api:' + url;
}

function readApiCache(url, maxAge) {
    // ponytail: per-URL expiry; add LRU eviction only if storage pressure appears.
    try {
        var cached = JSON.parse(localStorage.getItem(cacheKey(url)) || 'null');
        var age = cached ? new Date().getTime() - cached.time : -1;
        if (!cached || !cached.time || !isFinite(age) || age < 0 || age >= maxAge) {
            localStorage.removeItem(cacheKey(url));
            return null;
        }
        return cached.data ? cached : null;
    } catch (error) {
        return null;
    }
}

function writeApiCache(url, data) {
    try {
        localStorage.setItem(cacheKey(url), JSON.stringify({ time: new Date().getTime(), data: data }));
    } catch (error) {}
}

function validApiData(data, atHome) {
    return data && data.result === 'ok' && (atHome
        ? /^https:\/\//i.test(String(data.baseUrl || '')) && data.chapter && data.chapter.hash && Array.isArray(data.chapter.data)
        : (data.data && typeof data.data === 'object') || (data.statistics && typeof data.statistics === 'object'));
}

function browserApiRequest(url, deadline) {
    var browser = null;
    try {
        var remaining = deadline - new Date().getTime();
        if (remaining < 2000) return null;
        browser = Engine.newBrowser();
        browser.launch(url, Math.min(10000, remaining - 1000));
        remaining = deadline - new Date().getTime();
        if (remaining <= 0) return null;
        var text = String(browser.callJs('document.body.innerText', Math.min(1000, remaining)).text());
        // Windows WebView may JSON-quote the returned string once.
        if (text.charAt(0) === '"') text = JSON.parse(text);
        return JSON.parse(text);
    } catch (error) {
        return null;
    } finally {
        if (browser) {
            try { browser.close(); } catch (error) {}
        }
    }
}

function apiRequest(path, pairs) {
    var url = API_URL + path;
    var query = buildQuery(pairs || []);
    if (query) url += '?' + query;

    // At-home URLs are temporary: never use the metadata cache's 24-hour fallback.
    var atHome = path.indexOf('/at-home/server/') === 0;
    var maxAge = atHome ? 300000 : 86400000;
    var cached = readApiCache(url, maxAge);
    lastApiError = '';
    if (cached && new Date().getTime() - cached.time < 60000) return cached.data;

    // ponytail: three attempts within 30 seconds; an extension cannot repair a network outage.
    var started = new Date().getTime();
    var deadline = started + 30000;
    var browserTried = false;
    for (var attempt = 0; attempt < 3; attempt++) {
        var pause = 250 - (new Date().getTime() - lastApiRequestAt);
        if (pause > 0) sleep(pause);
        var remaining = deadline - new Date().getTime();
        if (remaining <= 0) break;
        var response = null;
        try {
            lastApiRequestAt = new Date().getTime();
            response = fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'VBook-MangaDex/7.0'
                },
                timeout: Math.min(10000, remaining)
            });
        } catch (error) {
            lastApiError = 'network error';
        }

        try {
            console.log('[MangaDex] path=' + path + ' attempt=' + (attempt + 1)
                + ' status=' + (response ? response.status : 'no response')
                + ' elapsedMs=' + (new Date().getTime() - lastApiRequestAt)
                + ' transportError=' + (!response || !response.url));
        } catch (logError) {}

        if (response && response.ok) {
            try {
                var body = response.text ? response.text() : '';
                var data = body ? JSON.parse(body) : (response.json ? response.json() : null);
                if (validApiData(data, atHome)) {
                    writeApiCache(url, data);
                    lastApiError = '';
                    return data;
                }
                lastApiError = 'invalid API response';
            } catch (error) {
                lastApiError = 'invalid JSON';
            }
        } else {
            var status = response ? Number(response.status) || 0 : 0;
            // vBook maps DNS/TLS/socket failures to 504 with an empty response URL.
            lastApiError = !response || (status === 504 && !response.url)
                ? 'network error (vBook 504)' : 'HTTP ' + status;
            if (!isTransientStatus(status)) break;
        }

        cached = readApiCache(url, maxAge);
        if (cached) {
            lastApiError = '';
            return cached.data;
        }
        // Native vBook networking can fail while WebView reaches the same official API.
        if (!browserTried && (!response || (Number(response.status) === 504 && !response.url))) {
            browserTried = true;
            var browserData = browserApiRequest(url, deadline);
            if (validApiData(browserData, atHome)) {
                writeApiCache(url, browserData);
                lastApiError = '';
                console.log('[MangaDex] recovered via WebView: ' + path);
                return browserData;
            }
        }
        if (attempt === 2) break;
        var delay = 1000 * (attempt + 1);
        try {
            var retry = String(response.header('Retry-After') || '');
            var reset = Number(response.header('X-RateLimit-Retry-After')) * 1000;
            var now = new Date().getTime();
            var wait = /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - now;
            if (isFinite(wait)) delay = Math.max(delay, wait);
            if (isFinite(reset)) delay = Math.max(delay, reset - now);
        } catch (error) {}
        if (delay + 1000 >= deadline - new Date().getTime()) break;
        sleep(delay);
    }
    lastApiError += ' [v7; ' + (new Date().getTime() - started) + ' ms; ' + path + ']';
    return null;
}

function apiError(message) {
    return Response.error(message + (lastApiError ? ' (' + lastApiError + ')' : ''));
}

function offsetOf(page) {
    var offset = parseInt(page, 10);
    return isNaN(offset) || offset < 0 ? 0 : offset;
}

function nextOffset(data) {
    if (!data || data.offset === undefined || data.limit === undefined || data.total === undefined) return '';
    var next = Number(data.offset) + Number(data.limit);
    return next < Number(data.total) ? String(next) : '';
}

function uuidFromUrl(url, type) {
    var pattern = new RegExp('(?:^|/)' + type + '/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[/?#]|$)', 'i');
    var match = String(url || '').match(pattern);
    return match ? match[1] : '';
}

function normalizeTitle(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    var languages = languageList();
    for (var i = 0; i < languages.length; i++) {
        if (value[languages[i]]) return String(value[languages[i]]);
    }
    var keys = Object.keys(value);
    for (var j = 0; j < keys.length; j++) {
        if (value[keys[j]]) return String(value[keys[j]]);
    }
    return '';
}

function cleanText(value) {
    if (!value) return '';
    return String(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&/gi, '&')
        .replace(/"/gi, '"')
        .replace(/'|'/gi, "'")
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '');
}

function relationship(item, type) {
    var relationships = item && item.relationships ? item.relationships : [];
    for (var i = 0; i < relationships.length; i++) {
        if (relationships[i].type === type) return relationships[i];
    }
    return null;
}

function relationshipName(item, type) {
    var rel = relationship(item, type);
    return rel && rel.attributes && rel.attributes.name ? String(rel.attributes.name) : '';
}

function coverUrl(mangaId, item, size) {
    var cover = relationship(item, 'cover_art');
    var fileName = cover && cover.attributes ? cover.attributes.fileName : '';
    return fileName ? UPLOADS_URL + '/covers/' + mangaId + '/' + encodeURIComponent(fileName) + '.' + (size || '256') + '.jpg' : '';
}

function mangaItem(item) {
    if (!item || !item.id || !item.attributes) return null;
    var attributes = item.attributes;
    var title = normalizeTitle(attributes.title);
    if (!title) return null;
    return {
        name: title,
        link: BASE_URL + '/title/' + item.id,
        cover: coverUrl(item.id, item, '256'),
        description: attributes.status ? String(attributes.status) : '',
        host: BASE_URL
    };
}

function mangaList(data) {
    var items = [];
    var rows = data && data.data ? data.data : [];
    for (var i = 0; i < rows.length; i++) {
        var item = mangaItem(rows[i]);
        if (item) items.push(item);
    }
    return items;
}

function baseMangaQuery(offset) {
    var pairs = [
        ['limit', PAGE_SIZE],
        ['offset', offsetOf(offset)],
        ['includes[]', 'cover_art']
    ];
    for (var i = 0; i < CONTENT_RATINGS.length; i++) pairs.push(['contentRating[]', CONTENT_RATINGS[i]]);
    return pairs;
}

function mangaQuery(extra, offset) {
    var pairs = baseMangaQuery(offset);
    for (var i = 0; i < (extra || []).length; i++) pairs.push(extra[i]);
    return pairs;
}

function languageQuery() {
    var pairs = [];
    var languages = languageList();
    for (var i = 0; i < languages.length; i++) pairs.push(['translatedLanguage[]', languages[i]]);
    return pairs;
}

function tagName(tag) {
    return normalizeTitle(tag && tag.attributes ? tag.attributes.name : null);
}
