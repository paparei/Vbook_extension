load('config.js');

function execute(input, page) {
    var current = pageNumber(page);
    var url = categoryPageUrl(input || COMIC_ROOT, current);
    if (!url) return Response.error('Danh mục Dilib không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải danh sách truyện');
    if (error) return error;

    var doc = response.html();
    var items = parseComicList(doc);
    if (!items.length) return Response.error('Không tìm thấy truyện tranh trong danh mục này');
    return Response.success(items, hasNextPage(doc, current) ? String(current + 1) : '');
}
