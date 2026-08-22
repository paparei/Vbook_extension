var BASE_URL = 'https://dilib.vn';
try {
    if (DOMAIN && /^https?:\/\//i.test(String(DOMAIN))) BASE_URL = String(DOMAIN).replace(/\/+$/, '');
} catch (error) {}

var BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
var SEARCH_PAGE_SIZE = 24;
var lastPageError = '';

function trimText(value) {
    return String(value || '').replace(/^\s+|\s+$/g, '');
}

function cleanText(value) {
    return trimText(String(value || '').replace(/\s+/g, ' '));
}

function baseHost() {
    var match = BASE_URL.match(/^https?:\/\/([^/:]+)/i);
    return match ? match[1].toLowerCase() : 'dilib.vn';
}

function normalizePageUrl(url) {
    url = trimText(url).replace(/&/gi, '&');
    if (!url) return '';
    if (url.indexOf('//') === 0) url = 'https:' + url;
    if (url.charAt(0) === '/') return BASE_URL + url;
    if (!/^https?:\/\//i.test(url)) return BASE_URL + '/' + url.replace(/^\/+/, '');

    var match = url.match(/^https?:\/\/([^/:]+)(?::\d+)?(\/[^\s]*)?$/i);
    if (!match || (match[1].toLowerCase() !== 'dilib.vn' && match[1].toLowerCase() !== baseHost())) return '';
    return BASE_URL + (match[2] || '/');
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
                'Referer': normalizePageUrl(referer) || BASE_URL + '/'
            },
            timeout: 30000
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

function isBookUrl(url) {
    return /^https?:\/\/[^/]+\/[a-z0-9][^/?#]*-\d+\.html(?:[?#].*)?$/i.test(String(url || ''));
}

function isEpubUrl(url) {
    return /^https?:\/\/[^/]+\/download\/epub\/[a-z0-9]+(?:[?#].*)?$/i.test(String(url || ''));
}

function searchPageUrl(key, page) {
    var url = BASE_URL + '/search.php?find=' + encodeURIComponent(trimText(key)).replace(/%20/g, '+') + '&media=1';
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
    var next = 'Tác giả|Số trang|Định dạng|Phân loại|Tình trạng|Lượt xem(?:/nghe)?|Lượt đọc|Lượt tải|Kích thước|Tạo lúc|Cập nhật lúc|THỂ LOẠI';
    var match = String(text || '').match(new RegExp(label + '\\s*:\\s*(.*?)(?=(?:' + next + ')\\s*:|$)', 'i'));
    return match ? cleanText(match[1]) : '';
}

function epubDownloadUrl(doc) {
    var url = normalizePageUrl(firstAttr(doc, 'a[href*="/download/epub/"]', 'href'));
    return isEpubUrl(url) ? url.replace(/#.*$/, '') : '';
}

function parseBookList(doc) {
    var items = [];
    var indexes = {};
    if (!doc) return items;

    doc.select('a.woocommerce-LoopProduct-link[href]').forEach(function (anchor) {
        var link = normalizePageUrl(anchor.attr('href'));
        if (!isBookUrl(link)) return;

        var image = anchor.select('img').first();
        var anchorText = cleanText(anchor.text());
        var imageName = image ? cleanText(image.attr('alt')) : '';
        var cover = image ? normalizeAssetUrl(image.attr('data-src') || image.attr('data-lazy-src') || image.attr('src')) : '';
        var index = indexes[link];

        if (typeof index === 'number') {
            if (anchorText) items[index].name = anchorText;
            if (cover) items[index].cover = cover;
            return;
        }
        if (!imageName && !anchorText) return;

        indexes[link] = items.length;
        items.push({ name: anchorText || imageName, link: link, cover: cover, description: '', host: BASE_URL });
    });
    return items;
}

function hasNextPage(doc, currentPage) {
    if (!doc) return false;
    var next = pageNumber(currentPage) + 1;
    var found = false;
    doc.select('a[href]').forEach(function (anchor) {
        var href = String(anchor.attr('href') || '');
        var text = cleanText(anchor.text()).toLowerCase();
        var classes = String(anchor.attr('class') || '').toLowerCase();
        if (href.indexOf('/page/' + next) >= 0 || href.indexOf('page=' + next) >= 0 || text === 'tiếp' || text === 'next' || /(?:^|\s)next(?:\s|$)/.test(classes)) found = true;
    });
    return found;
}

function searchResultTotal(doc) {
    var match = firstText(doc, 'body').match(/Có\s+([\d.,]+)\s+kết quả/i);
    return match ? parseInt(match[1].replace(/[^\d]/g, ''), 10) || 0 : 0;
}

function fetchEpubBase64(url) {
    url = normalizePageUrl(String(url || '').replace(/#.*$/, ''));
    if (!isEpubUrl(url)) throw new Error('URL EPUB Dilib không hợp lệ');

    var key = 'epub:' + url;
    var cached = '';
    try { cached = String(cacheStorage.getItem(key) || ''); } catch (error) {}
    if (cached) return cached;

    var response;
    try {
        response = fetch(url, {
            headers: {
                'User-Agent': BASE_UA,
                'Accept': 'application/epub+zip,application/zip,*/*',
                'Referer': BASE_URL + '/'
            },
            timeout: 60000
        });
    } catch (error) {
        throw new Error('Lỗi tải EPUB từ Dilib');
    }
    if (!response || !response.ok) throw new Error('Không thể tải EPUB' + (response && response.status ? ' (HTTP ' + response.status + ')' : ''));

    var data = String(response.base64() || '');
    if (!data) throw new Error('Dilib trả về EPUB trống');
    try { cacheStorage.setItem(key, data); } catch (error) {}
    return data;
}
