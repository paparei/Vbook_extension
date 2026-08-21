var BASE_URL = 'https://mangadex.org';
var API_URL = 'https://api.mangadex.org';
var UPLOADS_URL = 'https://uploads.mangadex.org';
var PAGE_SIZE = 24;
var CHAPTER_PAGE_SIZE = 100;
var LANGUAGE = 'vi,en';
var CONTENT_RATINGS = ['safe', 'suggestive', 'erotica'];
var lastApiError = '';

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

function apiRequest(path, pairs) {
    var url = API_URL + path;
    var query = buildQuery(pairs || []);
    if (query) url += '?' + query;

    lastApiError = '';
    var response;
    try {
        response = fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'VBook-MangaDex/2.0'
            },
            timeout: 20000
        });
    } catch (error) {
        lastApiError = 'network error';
        return null;
    }
    if (!response || !response.ok) {
        lastApiError = response && response.status ? 'HTTP ' + response.status : 'network error';
        return null;
    }

    try {
        var body = response.text ? response.text() : '';
        var data = body ? JSON.parse(body) : (response.json ? response.json() : null);
        if (!data) lastApiError = 'empty response';
        return data;
    } catch (error) {
        lastApiError = 'invalid JSON';
        return null;
    }
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
