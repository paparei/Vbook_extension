load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isBookUrl(url)) return Response.error('URL sách Dilib không hợp lệ');

    var response = fetchPage(url);
    if (!response) return Response.error(lastPageError || 'Không thể tải thông tin sách');
    if (!response.ok) return Response.error('Không thể tải thông tin sách' + (response.status ? ' (HTTP ' + response.status + ')' : ''));
    var html = responseText(response);
    if (!html) return Response.error(lastPageError || 'Dilib trả về trang trống');

    var doc = response.html();
    if (!epubDownloadUrl(doc)) return Response.error('Sách này không có bản EPUB');
    var main = doc.select('.primary').first() || doc;
    var bodyText = cleanText(main.text());
    var name = firstText(doc, 'h1') || cleanText(firstAttr(doc, 'meta[property="og:title"]', 'content'));
    var cover = normalizeAssetUrl(firstAttr(doc, 'meta[property="og:image"]', 'content'));
    if (!cover) cover = normalizeAssetUrl(firstAttr(doc, '.primary img.border, .primary img', 'src'));
    var description = firstAttr(doc, 'meta[property="og:description"]', 'content');
    if (!description) description = firstText(doc, '.primary .description, .primary [class*="description"], .primary .entry-content');
    description = cleanText(description).replace(/\s*,\s*Thư Viện Số\s*$/i, '');

    return Response.success({
        name: cleanText(name),
        cover: cover,
        author: labeledValue(bodyText, 'Tác giả'),
        description: description,
        detail: [
            labeledValue(bodyText, 'Số trang'),
            labeledValue(bodyText, 'Định dạng'),
            labeledValue(bodyText, 'Tình trạng')
        ].filter(function (value) { return !!value; }).join(' | '),
        url: url,
        type: 'novel',
        format: 'novel',
        ongoing: /Đang Cập Nhật|Đang cập nhật/i.test(bodyText),
        nsfw: /Adult \(18\+\)|Người Lớn \(18\+\)|adult|mature/i.test(bodyText),
        locale: 'vi'
    });
}
