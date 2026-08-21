var BASE_URL = 'https://batcave.biz';
var IMAGE_HOST = 'img.batcave.biz';
var BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
var lastPageError = '';

function trimText(value) {
    return String(value || '').replace(/^\s+|\s+$/g, '');
}

function cleanText(value) {
    return trimText(String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&/gi, '&')
        .replace(/"|&#34;/gi, '"')
        .replace(/'|'/gi, "'")
        .replace(/</gi, '<')
        .replace(/>/gi, '>')
        .replace(/\s+/g, ' '));
}

function configuredCookie() {
    var value = '';
    try {
        if (batcave_cookie) value = String(batcave_cookie);
    } catch (error) {}
    return trimText(value.replace(/[\r\n]/g, ''));
}

function normalizePageUrl(url) {
    url = trimText(url);
    if (!url) return '';
    if (url.indexOf('//') === 0) url = 'https:' + url;
    if (url.charAt(0) === '/') return BASE_URL + url;
    if (!/^https?:\/\//i.test(url)) return BASE_URL + '/' + url.replace(/^\/+/, '');

    var match = url.match(/^https?:\/\/(?:www\.)?batcave\.biz(?::\d+)?(\/[^\s]*)?$/i);
    return match ? BASE_URL + (match[1] || '/') : '';
}

function normalizeAssetUrl(url) {
    url = trimText(url)
        .replace(/\\u002f/gi, '/')
        .replace(/\\\//g, '/')
        .replace(/&/gi, '&');
    if (!url || /^(?:data|javascript):/i.test(url)) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (/^https?:\/\//i.test(url)) return url;
    return BASE_URL + (url.charAt(0) === '/' ? url : '/' + url);
}

function fetchPage(url) {
    url = normalizePageUrl(url);
    if (!url) {
        lastPageError = 'URL BatCave không hợp lệ';
        return null;
    }

    var headers = {
        'User-Agent': BASE_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': BASE_URL + '/'
    };
    var cookie = configuredCookie();
    if (cookie) headers.Cookie = cookie;

    lastPageError = '';
    try {
        return fetch(url, { headers: headers, timeout: 20000 });
    } catch (error) {
        lastPageError = 'Lỗi kết nối';
        return null;
    }
}

function responseText(response) {
    try {
        return response && response.text ? String(response.text() || '') : '';
    } catch (error) {
        lastPageError = 'Không đọc được phản hồi';
        return '';
    }
}

function pageResponseError(response, html, action) {
    action = action || 'tải trang';
    if (!response) return Response.error(lastPageError || ('Không thể ' + action));
    var status = Number(response.status) || 0;
    var blocked = status === 401 || status === 403 || /cf-chl-|just a moment|<title>[^<]*(?:sign in to keep reading|401 unauthorized)/i.test(html || '');
    if (blocked) {
        return Response.error('BatCave đang yêu cầu xác thực/Cloudflare. Hãy đăng nhập trên trình duyệt rồi nhập Cookie vào cài đặt extension.');
    }
    if (!response.ok) return Response.error('Không thể ' + action + (status ? ' (HTTP ' + status + ')' : ''));
    if (!html) return Response.error('BatCave trả về trang trống');
    return null;
}

function pageNumber(value) {
    var number = parseInt(value, 10);
    return isNaN(number) || number < 1 ? 1 : number;
}

function pagedUrl(input, page) {
    var url = normalizePageUrl(input);
    var number = pageNumber(page);
    if (!url || number === 1) return url;
    url = url.replace(/[?#].*$/, '').replace(/\/(?:page\/\d+\/?)?$/, '');
    return url + '/page/' + number + '/';
}

function isSeriesUrl(url) {
    return /^https?:\/\/(?:www\.)?batcave\.biz\/\d+[^\/?#]*\.html(?:[?#].*)?$/i.test(String(url || ''));
}

function firstText(root, selector) {
    var element = root.select(selector).first();
    return element ? cleanText(element.text()) : '';
}

function firstAttr(root, selector, attribute) {
    var element = root.select(selector).first();
    return element ? trimText(element.attr(attribute)) : '';
}

function parseComicList(doc) {
    var result = [];
    var seen = {};
    if (!doc) return result;

    doc.select('a[href*=".html"]').forEach(function (anchor) {
        var link = normalizePageUrl(anchor.attr('href'));
        if (!isSeriesUrl(link) || seen[link]) return;

        var image = anchor.select('img').first();
        var titleElement = anchor.select('h1, h2, h3, h4, .title, .name').first();
        var name = cleanText(anchor.attr('title'));
        if (!name && titleElement) name = cleanText(titleElement.text());
        if (!name && image) name = cleanText(image.attr('alt') || image.attr('title'));
        if (!name) name = cleanText(anchor.text());
        if (!name) return;

        var cover = '';
        if (image) cover = normalizeAssetUrl(image.attr('data-src') || image.attr('data-original') || image.attr('data-lazy-src') || image.attr('src'));
        var badge = anchor.select('.chapter, .issue, .badge, .latest').first();

        seen[link] = true;
        result.push({
            name: name,
            link: link,
            cover: cover,
            description: badge ? cleanText(badge.text()) : '',
            host: BASE_URL
        });
    });
    return result;
}

function hasNextPage(doc, currentPage) {
    if (!doc) return false;
    var found = false;
    var expected = pageNumber(currentPage) + 1;
    doc.select('a').forEach(function (anchor) {
        if (found) return;
        var rel = String(anchor.attr('rel') || '').toLowerCase();
        var classes = String(anchor.attr('class') || '').toLowerCase();
        var text = cleanText(anchor.text()).toLowerCase();
        var href = String(anchor.attr('href') || '');
        if (rel === 'next' || /(?:^|\s)next(?:\s|$)/.test(classes) || text === 'next' || text === '›' || text === '»' || href.indexOf('/page/' + expected) >= 0 || href.indexOf('search_start=' + expected) >= 0) found = true;
    });
    return found;
}

function readerLinks(doc, html) {
    var result = [];
    var seen = {};

    function add(url, name) {
        url = normalizePageUrl(url);
        if (!url || !/\/reader\/\d+\/\d+(?:[/?#]|$)/i.test(url) || seen[url]) return;
        seen[url] = true;
        result.push({ name: cleanText(name) || ('Issue ' + (result.length + 1)), url: url, host: BASE_URL });
    }

    if (doc) {
        doc.select('a[href*="/reader/"]').forEach(function (anchor) {
            add(anchor.attr('href'), anchor.attr('title') || anchor.text());
        });
        doc.select('option[value*="/reader/"]').forEach(function (option) {
            add(option.attr('value'), option.text());
        });
        doc.select('[data-href*="/reader/"]').forEach(function (element) {
            add(element.attr('data-href'), element.attr('title') || element.text());
        });
    }

    var source = String(html || '').replace(/\\\//g, '/').replace(/&/gi, '&');
    var pattern = /(?:https?:\/\/(?:www\.)?batcave\.biz)?\/reader\/\d+\/\d+/gi;
    var match;
    while ((match = pattern.exec(source)) !== null) add(match[0], '');
    return result;
}

function pageImages(doc, html) {
    var result = [];
    var seen = {};

    function add(url, hint) {
        url = normalizeAssetUrl(url);
        if (!url || seen[url] || !/\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(url)) return;
        var pageLike = new RegExp('^https?://' + IMAGE_HOST.replace('.', '\\.') + '(?:/|$)', 'i').test(url) || /\/(?:chapter|comic|pages?|reader)\//i.test(url) || /(?:chapter|comic|page|reader)/i.test(hint || '');
        if (!pageLike || /(?:avatar|banner|cover|favicon|icon|logo|sprite|thumb)/i.test(url)) return;
        seen[url] = true;
        result.push(url);
    }

    if (doc) {
        doc.select('img').forEach(function (image) {
            var hint = String(image.attr('class') || '') + ' ' + String(image.attr('id') || '');
            add(image.attr('data-src') || image.attr('data-original') || image.attr('data-lazy-src') || image.attr('src'), hint);
        });
        doc.select('source[srcset]').forEach(function (source) {
            var srcset = String(source.attr('srcset') || '').split(',')[0].replace(/\s+\d+(?:\.\d+)?[wx]\s*$/, '');
            add(srcset, 'reader page');
        });
    }

    var sourceHtml = String(html || '')
        .replace(/\\u002f/gi, '/')
        .replace(/\\\//g, '/')
        .replace(/&/gi, '&');
    var pattern = /(?:https?:\/\/|\/\/|\/)[^\s"'<>\\]+?\.(?:avif|gif|jpe?g|png|webp)(?:\?[^\s"'<>\\]*)?/gi;
    var match;
    while ((match = pattern.exec(sourceHtml)) !== null) add(match[0], '');
    return result;
}
