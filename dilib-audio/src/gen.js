load('config.js');

function execute(input, page) {
    var current = pageNumber(page);
    var url = categoryPageUrl(input, current);
    if (!url) return Response.error('Danh mục âm thanh Dilib không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải danh sách âm thanh');
    if (error) return error;

    var doc = response.html();
    var items = parseAudioList(doc);
    if (!items.length) return Response.error('Không tìm thấy sách nói hoặc radio trong danh mục này');
    return Response.success(items, hasNextPage(doc, current) ? String(current + 1) : '');
}
