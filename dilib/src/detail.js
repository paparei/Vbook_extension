load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isSeriesUrl(url)) return Response.error('URL truyện Dilib không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải thông tin truyện');
    if (error) return error;
    var doc = response.html();
    var main = doc.select('.primary').first() || doc;
    var bodyText = cleanText(main.text());
    var chapterList = chapterLinks(doc);
    if (!chapterList.length && !/Phân loại\s*:\s*Truyện Tranh/i.test(bodyText)) {
        return Response.error('Mục này không phải truyện tranh Dilib');
    }

    var name = firstText(doc, 'h1') || cleanText(firstAttr(doc, 'meta[property="og:title"]', 'content'));
    var cover = normalizeAssetUrl(firstAttr(doc, 'meta[property="og:image"]', 'content'));
    if (!cover) cover = normalizeAssetUrl(firstAttr(doc, '.primary img.border, .primary img', 'src'));

    var author = labeledValue(bodyText, 'Tác giả');

    var description = firstAttr(doc, 'meta[property="og:description"]', 'content');
    if (!description) description = firstText(doc, '.primary .description, .primary [class*="description"], .primary .entry-content');
    description = cleanText(description).replace(/\s*,\s*Thư Viện Số\s*$/i, '');

    var genres = [];
    var seen = {};
    doc.select('a[href*="/truyen-tranh/"]').forEach(function (anchor) {
        var link = normalizePageUrl(anchor.attr('href'));
        var title = cleanText(anchor.text());
        if (!title || !link || isChapterUrl(link) || seen[link]) return;
        seen[link] = true;
        genres.push({ title: title, input: link, script: 'gen.js' });
    });

    return Response.success({
        name: cleanText(name),
        cover: cover,
        author: author,
        description: description,
        detail: [
            labeledValue(bodyText, 'Số Chap') || labeledValue(bodyText, 'Tổng số Chap'),
            labeledValue(bodyText, 'Số trang'),
            labeledValue(bodyText, 'Định dạng'),
            labeledValue(bodyText, 'Tình trạng')
        ].filter(function (value) { return !!value; }).join(' | '),
        url: url,
        genres: genres,
        ongoing: /Đang Cập Nhật|Đang cập nhật/i.test(bodyText),
        nsfw: /Adult \(18\+\)|Người Lớn \(18\+\)|adult|mature/i.test(bodyText)
    });
}
