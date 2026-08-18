var BASE_URL = 'https://anime47.best';
var API_URL = 'https://anime47.love/api';

var DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://anime47.best/',
    'Origin': 'https://anime47.best',
    'Accept': 'application/json, text/plain, */*'
};

function getSetting(key) {
    try {
        if (typeof Setting !== 'undefined' && Setting && typeof Setting.get === 'function') {
            return Setting.get(key);
        }
    } catch (e) {}
    return '';
}

function fetchApi(url, options) {
    options = options || {};
    var headers = Object.assign({}, DEFAULT_HEADERS, options.headers || {});
    var token = getSetting('auth_token');
    if (token && !headers['Authorization']) {
        headers['Authorization'] = token.indexOf('Bearer ') === 0 ? token : ('Bearer ' + token);
    }
    options.headers = headers;
    return fetch(url, options);
}

function fetchJson(url, options) {
    var response = fetchApi(url, options);
    if (!response || !response.text) return null;
    try {
        return JSON.parse(response.text());
    } catch (e) {
        return null;
    }
}

function fetchPage(url, options) {
    return fetchApi(url, options);
}

function normalizeUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) return url;
    if (url.indexOf('/') === 0) return BASE_URL + url;
    return BASE_URL + '/' + url;
}

function cleanText(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/"/g, '"').replace(/'/g, "'").trim();
}

function extractInitialState(html) {
    if (!html) return null;
    var match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\});\s*<\/script>/);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Fallback Response object if not globally provided by VBook engine
if (typeof Response === 'undefined') {
    Response = {
        success: function(data, nextPage) {
            return JSON.stringify({
                status: 200,
                data: data,
                next: nextPage ? String(nextPage) : null
            });
        },
        error: function(message) {
            return JSON.stringify({
                status: 500,
                message: message || 'Unknown error'
            });
        }
    };
}
