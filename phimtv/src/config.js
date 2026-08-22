var BASE_URL = 'https://phimtv.cv';
var DEFAULT_REFERER = BASE_URL + '/';
var BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fetchPage(url, options) {
    options = options || {};
    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': DEFAULT_REFERER
    };
    var extra = options.headers || {};
    for (var key in extra) headers[key] = extra[key];
    options.headers = headers;
    return fetch(url, options);
}

function normalizeUrl(url) {
    if (!url) return '';
    url = String(url);
    if (url.indexOf('//') === 0) url = 'https:' + url;
    if (/^https?:\/\//i.test(url)) {
        var path = url.replace(/^https?:\/\/[^/]+/i, '');
        return BASE_URL + (path || '/');
    }
    return BASE_URL + (url.charAt(0) === '/' ? url : '/' + url);
}

function normalizeAssetUrl(url) {
    if (!url) return '';
    url = String(url);
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (/^https?:\/\//i.test(url)) return url;
    return BASE_URL + (url.charAt(0) === '/' ? url : '/' + url);
}

function cleanText(value) {
    return value ? String(value).replace(/\s+/g, ' ').trim() : '';
}

function pageUrl(url, page) {
    var result = normalizeUrl(url);
    var number = parseInt(page, 10);
    if (number > 1) result += (result.indexOf('?') >= 0 ? '&' : '?') + 'page=' + number;
    return result;
}

function nextPage(doc, page) {
    var current = parseInt(page, 10) || 1;
    var next = '';
    doc.select('.pagination a, a[rel="next"]').forEach(function (link) {
        var href = link.attr('href') || '';
        if (href.indexOf('page=' + (current + 1)) >= 0 || (link.attr('rel') || '') === 'next') next = String(current + 1);
    });
    return next;
}

function parseFilmItems(doc) {
    var result = [];
    var seen = {};
    doc.select('.item').forEach(function (item) {
        var anchor = item.select('a[href*="/phim/"]').first();
        if (!anchor) return;
        var link = normalizeUrl(anchor.attr('href'));
        if (!link || seen[link]) return;
        var heading = anchor.select('h3').first() || anchor.select('p').first();
        var name = cleanText(anchor.attr('title')) || (heading ? cleanText(heading.text()) : '');
        if (!name) return;
        var image = anchor.select('img').first();
        var cover = image ? (image.attr('data-src') || image.attr('data-lazy-src') || image.attr('src') || '') : '';
        var label = item.select('.status').first() || item.select('.film-format').first() || item.select('.label').first();
        seen[link] = true;
        result.push({
            name: name,
            link: link,
            cover: normalizeAssetUrl(cover),
            tag: label ? cleanText(label.text()) : '',
            host: BASE_URL
        });
    });
    return result;
}
