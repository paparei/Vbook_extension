load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isItemUrl(url)) return Response.error('URL sách nói Dilib không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải thông tin sách nói');
    if (error) return error;

    var doc = response.html();
    var mediaUrl = audioUrl(doc);
    if (!mediaUrl) return Response.error('Mục này không có audio MP3 trên Dilib');

    var main = doc.select('.primary').first() || doc;
    var bodyText = cleanText(main.text());
    var name = firstText(doc, 'h1') || cleanText(firstAttr(doc, 'meta[property="og:title"]', 'content'));
    var cover = normalizeAssetUrl(firstAttr(doc, 'meta[property="og:image"]', 'content'));
    if (!cover) cover = normalizeAssetUrl(firstAttr(doc, '.primary img.border, .primary img', 'src'));
    var author = labeledValue(bodyText, 'Tác giả');
    var description = cleanText(firstAttr(doc, 'meta[property="og:description"]', 'content'));
    if (!description) description = firstText(doc, '.primary .description, .primary [class*="description"], .primary .entry-content');
    description = description.replace(/\s*,\s*Thư Viện Số\s*$/i, '');

    var classification = labeledValue(bodyText, 'Phân loại');
    var duration = labeledValue(bodyText, 'Thời lượng');
    return Response.success({
        name: cleanText(name),
        cover: cover,
        author: author,
        description: description,
        detail: [duration, classification, labeledValue(bodyText, 'Định dạng'), labeledValue(bodyText, 'Tình trạng')]
            .filter(function (value) { return !!value; }).join(' | '),
        url: url,
        type: 'audio',
        format: 'audio',
        ongoing: /Đang Cập Nhật|Đang cập nhật/i.test(bodyText),
        nsfw: /Adult \(18\+\)|Người Lớn \(18\+\)|adult|mature/i.test(bodyText)
    });
}
