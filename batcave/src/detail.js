load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isSeriesUrl(url)) return Response.error('URL truyện BatCave không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải thông tin truyện');
    if (error) return error;
    var doc = response.html();

    var name = firstAttr(doc, 'meta[property="og:title"]', 'content') || firstText(doc, 'h1');
    name = cleanText(name.replace(/\s+(?:Comics Online Free|Read Comics Online|[-|]\s*BatCave).*$/i, ''));

    var cover = normalizeAssetUrl(firstAttr(doc, 'meta[property="og:image"]', 'content'));
    if (!cover) cover = normalizeAssetUrl(firstAttr(doc, '.poster img, .cover img, [itemprop="image"]', 'data-src') || firstAttr(doc, '.poster img, .cover img, [itemprop="image"]', 'src'));

    var description = cleanText(firstAttr(doc, 'meta[property="og:description"]', 'content'));
    if (!description) description = firstText(doc, '[itemprop="description"], .description, .full-text, .story-text');

    var author = firstText(doc, '[itemprop="author"], .author, .writer');
    var detail = firstText(doc, '.story-info, .comic-info, .fullinfo, .info');
    var genres = [];
    var seenGenres = {};
    doc.select('a[href*="/genre/"], a[href*="/genres/"], a[href*="/tags/"], a[href*="/xfsearch/"]').forEach(function (anchor) {
        var title = cleanText(anchor.text());
        var link = normalizePageUrl(anchor.attr('href'));
        if (!title || !link || seenGenres[title]) return;
        seenGenres[title] = true;
        genres.push({ title: title, input: link, script: 'gen.js' });
    });

    if (!name) return Response.error('Không tìm thấy tên truyện trên BatCave');
    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        detail: detail,
        url: url,
        genres: genres,
        ongoing: /\(\d{4}-\)/.test(name),
        nsfw: false
    });
}
