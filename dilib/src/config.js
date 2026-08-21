var BASE_URL = 'https://dilib.vn';
var COMIC_ROOT = BASE_URL + '/truyen-tranh/';
var BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
var SEARCH_PAGE_SIZE = 24;
var lastPageError = '';

function trimText(value) {
    return String(value || '').replace(/^\s+|\s+$/g, '');
}

function cleanText(value) {
    return trimText(String(value || '').replace(/\s+/g, ' '));
}

function normalizePageUrl(url) {
    url = trimText(url).replace(/&/gi, '&');
    if (!url) return '';
    if (url.indexOf('//') === 0) url = 'https:' + url;
    if (url.charAt(0) === '/') return BASE_URL + url;
    if (!/^https?:\/\//i.test(url)) return BASE_URL + '/' + url.replace(/^\/+/, '');

    var match = url.match(/^https?:\/\/dilib\.vn(?::\d+)?(\/[^\s]*)?$/i);
    return match ? BASE_URL + (match[1] || '/') : '';
}

function normalizeAssetUrl(url) {
    url = trimText(url).replace(/&/gi, '&').replace(/\\u002f/gi, '/').replace(/\\\//g, '/');
    if (!url || /^(?:data|javascript):/i.test(url)) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (/^https?:\/\//i.test(url)) return url;
    return BASE_URL + (url.charAt(0) === '/' ? url : '/' + url);
}

function fetchPage(url, referer) {
    url = normalizePageUrl(url);
    if (!url) {
        lastPageError = 'URL Dilib không hợp lệ';
        return null;
    }

    lastPageError = '';
    try {
        return fetch(url, {
            headers: {
                'User-Agent': BASE_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.7',
                'Referer': normalizePageUrl(referer) || COMIC_ROOT
            },
            timeout: 20000
        });
    } catch (error) {
        lastPageError = 'Lỗi kết nối Dilib';
        return null;
    }
}

function responseText(response) {
    try {
        return response && response.text ? String(response.text() || '') : '';
    } catch (error) {
        lastPageError = 'Không đọc được phản hồi Dilib';
        return '';
    }
}

function pageResponseError(response, html, action) {
    action = action || 'tải trang';
    if (!response) return Response.error(lastPageError || ('Không thể ' + action));
    var status = Number(response.status) || 0;
    if (!response.ok) return Response.error('Không thể ' + action + (status ? ' (HTTP ' + status + ')' : ''));
    if (!html) return Response.error('Dilib trả về trang trống');
    return null;
}

function pageNumber(value) {
    var number = parseInt(value, 10);
    return isNaN(number) || number < 1 ? 1 : number;
}

function isSeriesUrl(url) {
    return /^https?:\/\/dilib\.vn\/[a-z0-9][^/?#]*-\d+\.html(?:[?#].*)?$/i.test(String(url || ''));
}

function isChapterUrl(url) {
    return /^https?:\/\/dilib\.vn\/truyen-tranh\/[a-z0-9][^/?#]*-\d+-chap-\d+\.html(?:[?#].*)?$/i.test(String(url || ''));
}

function categoryPageUrl(input, page) {
    var url = normalizePageUrl(input || COMIC_ROOT);
    if (!/^https?:\/\/dilib\.vn\/truyen-tranh\//i.test(url)) return '';
    url = url.replace(/[?#].*$/, '').replace(/page\/\d+\/?$/i, '').replace(/\/+$/, '/') ;
    var current = pageNumber(page);
    return current > 1 ? url + 'page/' + current : url;
}

function searchPageUrl(key, page) {
    var url = BASE_URL + '/search.php?find=' + encodeURIComponent(trimText(key)).replace(/%20/g, '+') + '&media=5';
    var current = pageNumber(page);
    return current > 1 ? url + '&page=' + current : url;
}

function firstText(root, selector) {
    var element = root.select(selector).first();
    return element ? cleanText(element.text()) : '';
}

function firstAttr(root, selector, attribute) {
    var element = root.select(selector).first();
    return element ? trimText(element.attr(attribute)) : '';
}

function labeledValue(text, label) {
    var next = 'Tác giả|Số Chap|Tổng số Chap|Số trang|Định dạng|Phân loại|Tình trạng|Lượt xem(?:/nghe)?|Lượt đọc|Lượt tải|Truyện tranh CBZ|Tạo lúc|Cập nhật lúc|THỂ LOẠI';
    var match = String(text || '').match(new RegExp(label + '\\s*:\\s*(.*?)(?=' + next + '|$)', 'i'));
    return match ? cleanText(match[1]) : '';
}

function parseComicList(doc) {
    var items = [];
    var indexes = {};
    if (!doc) return items;

    doc.select('a.woocommerce-LoopProduct-link[href]').forEach(function (anchor) {
        var link = normalizePageUrl(anchor.attr('href'));
        if (!isSeriesUrl(link)) return;

        var image = anchor.select('img').first();
        var anchorText = cleanText(anchor.text());
        var imageName = image ? cleanText(image.attr('alt')) : '';
        var name = imageName || anchorText;
        var description = /\b(?:chap|chapter)\b/i.test(anchorText) ? anchorText : '';
        var cover = image ? normalizeAssetUrl(image.attr('data-src') || image.attr('data-lazy-src') || image.attr('src')) : '';
        var index = indexes[link];

        if (typeof index === 'number') {
            if (anchorText && !description) items[index].name = anchorText;
            if (cover) items[index].cover = cover;
            if (description) items[index].description = description;
            return;
        }
        if (!name) return;

        indexes[link] = items.length;
        items.push({ name: name, link: link, cover: cover, description: description, host: BASE_URL });
    });
    return items;
}

function hasNextPage(doc, currentPage) {
    if (!doc) return false;
    var next = pageNumber(currentPage) + 1;
    var found = false;
    doc.select('a[href]').forEach(function (anchor) {
        if (found) return;
        var href = String(anchor.attr('href') || '');
        var text = cleanText(anchor.text()).toLowerCase();
        var classes = String(anchor.attr('class') || '').toLowerCase();
        if (href.indexOf('/page/' + next) >= 0 || href.indexOf('page=' + next) >= 0 || text === 'tiếp' || text === 'next' || /(?:^|\s)next(?:\s|$)/.test(classes)) found = true;
    });
    return found;
}

function searchResultTotal(doc) {
    var text = firstText(doc, 'body');
    var match = text.match(/Có\s+([\d.,]+)\s+kết quả/i);
    return match ? parseInt(match[1].replace(/[^\d]/g, ''), 10) || 0 : 0;
}

function chapterLinks(doc) {
    var chapters = [];
    var seen = {};
    if (!doc) return chapters;

    doc.select('a[href*="/truyen-tranh/"][href*="-chap-"]').forEach(function (anchor) {
        var url = normalizePageUrl(anchor.attr('href'));
        if (!isChapterUrl(url) || seen[url]) return;
        var match = url.match(/-chap-(\d+)\.html/i);
        seen[url] = true;
        chapters.push({ name: match ? 'Chap ' + match[1] : cleanText(anchor.text()), url: url, host: BASE_URL });
    });
    return chapters;
}

function comicImages(doc) {
    var images = [];
    var seen = {};
    if (!doc) return images;

    doc.select('img').forEach(function (image) {
        var url = normalizeAssetUrl(image.attr('data-src') || image.attr('data-lazy-src') || image.attr('src'));
        if (!/\/img\/comic\//i.test(url) || seen[url]) return;
        seen[url] = true;
        images.push(url);
    });
    return images;
}
