var BASE_URL = 'https://animevsub.app';
var DEFAULT_REFERER = 'https://animevsub.app/';
var BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fetchPage(url, options) {
    if (!options) options = {};

    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };

    if (options.headers) {
        for (var key in options.headers) {
            headers[key] = options.headers[key];
        }
    }

    options.headers = headers;
    return fetch(url, options);
}

// Rewrites any old/mirror host to BASE_URL so stale library urls keep working
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

// Shared listing parser for gen.js/search.js (WordPress .movie-item grid)
function parseMovieList(doc) {
    var list = [];
    var seen = {};
    var items = doc.select('.movie-item');

    items.forEach(function (item) {
        var titleEl = item.select('.movie-title a').first();
        if (!titleEl) return;

        var name = cleanText(titleEl.text()) || cleanText(titleEl.attr('title'));
        var link = normalizeUrl(titleEl.attr('href'));
        if (!name || !link || seen[link]) return;
        seen[link] = true;

        var imgEl = item.select('.movie-poster img').first();
        var cover = imgEl ? (imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '') : '';

        // episode badge lives in .quality-badge ("Tập 15"); .movie-episode-last no longer exists
        var ep = cleanText(item.select('.quality-badge').text());

        list.push({
            name: name,
            link: link,
            cover: normalizeUrl(cover),
            description: ep,
            host: BASE_URL
        });
    });

    return list;
}

function hasNextPage(doc) {
    return doc.select('a.next.page-numbers').size() > 0;
}
