load('config.js');

function execute(url, page) {
    // ponytail: site ignores ?page= (server returns page 1 again) — single page only.
    // Upgrade: if the site gains real pagination, append ?page=N and emit a next token.
    var response = fetchPage(normalizeUrl(url));
    if (!response.ok) return Response.error('HTTP ' + response.status);

    var doc = response.html();
    if (!doc) return Response.success([]);

    var list = [];

    // Unified selector matching both main grid items and movie-card recommendations
    var items = doc.select('a[href*="/phim/"]:has(img)');

    items.forEach(function (item) {
        var name = cleanText(item.attr('title'));
        if (!name) {
            var h3 = item.select('h3').first();
            if (h3) name = cleanText(h3.text());
        }
        if (!name) {
            var p = item.select('p.font-medium').first();
            if (p) name = cleanText(p.text());
        }
        if (!name) return;

        var link = normalizeUrl(item.attr('href'));
        if (!link) return;

        // Extract cover image
        var imgEl = item.select('img').first();
        var cover = '';
        if (imgEl) {
            cover = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';
        }
        cover = normalizeUrl(cover);

        // Intelligently parse badge texts from spans and divs
        var tag = '';
        var quality = '';
        var lang = '';

        item.select('span, div, p').forEach(function (el) {
            var txt = cleanText(el.text());
            if (!txt || txt === name) return;

            var txtLower = txt.toLowerCase();

            // 1. Progress badge (Tag)
            if (txtLower.indexOf('tập') >= 0 || txtLower.indexOf('trọn bộ') >= 0 || txtLower.indexOf('hoàn thành') >= 0 || txtLower.indexOf('hoàn tất') >= 0 || txtLower.indexOf('full') >= 0) {
                if (txt.length < 30) tag = txt;
            }
            // 2. Language badge
            else if (txtLower.indexOf('vietsub') >= 0 || txtLower.indexOf('lồng tiếng') >= 0 || txtLower.indexOf('thuyết minh') >= 0) {
                if (txt.length < 30) lang = txt;
            }
            // 3. Quality badge
            else if (txtLower === 'fhd' || txtLower === 'hd' || txtLower === 'sd' || txtLower === 'cam' || txtLower === '2k' || txtLower === '4k') {
                quality = txt;
            }
        });

        // Fallback for progress badge from any bottom class
        if (!tag) {
            var bottomEl = item.select('[class*="bottom-"]').first();
            if (bottomEl) tag = cleanText(bottomEl.text());
        }

        // Standardize description
        var descParts = [];
        if (quality) descParts.push(quality);
        if (lang) descParts.push(lang);

        list.push({
            name: name,
            link: link,
            cover: cover,
            tag: tag,
            description: descParts.join(' • '),
            host: BASE_URL
        });
    });

    // Deduplicate by link
    var seen = {};
    var unique = [];
    list.forEach(function (item) {
        if (!seen[item.link]) {
            seen[item.link] = true;
            unique.push(item);
        }
    });

    return Response.success(unique);
}
