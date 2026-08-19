var BASE_URL = 'https://animevietsub.gg';
var DEFAULT_REFERER = 'https://animevietsub.gg/';
var BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fetchPage(url, options) {
    if (!options) options = {};

    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': DEFAULT_REFERER
    };

    if (options.headers) {
        for (var key in options.headers) {
            headers[key] = options.headers[key];
        }
    }

    options.headers = headers;
    return fetch(url, options);
}

// Rewrites any old host (animehay.fm) to BASE_URL so stale library urls keep working
function normalizeUrl(url) {
    if (!url) return '';
    url = String(url);
    if (url.indexOf('//') === 0) url = 'https:' + url;
    if (url.indexOf('http') === 0) {
        var rest = url.replace(/^https?:\/\/[^\/]+/i, '');
        return BASE_URL + (rest || '/');
    }
    if (url.indexOf('/') !== 0) url = '/' + url;
    return BASE_URL + url;
}

function cleanText(text) {
    if (!text) return '';
    return String(text).replace(/\s+/g, ' ').trim();
}

// Next.js RSC payloads embed JSON inside JS strings, so quotes arrive escaped (\").
// Unescape once before regex-matching — shared by toc.js and chap.js.
function unescapeRsc(html) {
    if (!html) return '';
    return html.replace(/\\"/g, '"');
}
