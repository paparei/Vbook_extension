load('config.js');

function execute(input, page) {
    var current = pageNumber(page);
    var response = fetchPage(pagedUrl(input || BASE_URL + '/', current));
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải danh sách truyện');
    if (error) return error;

    var doc = response.html();
    var items = parseComicList(doc);
    return Response.success(items, hasNextPage(doc, current) ? String(current + 1) : '');
}
