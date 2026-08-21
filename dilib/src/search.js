load('config.js');

function execute(key, page) {
    key = trimText(key);
    if (!key) return Response.success([]);

    var current = pageNumber(page);
    var response = fetchPage(searchPageUrl(key, current));
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tìm truyện');
    if (error) return error;

    var doc = response.html();
    var items = parseComicList(doc);
    var total = searchResultTotal(doc);
    var next = hasNextPage(doc, current) || (total > current * SEARCH_PAGE_SIZE) ? String(current + 1) : '';
    return Response.success(items, next);
}
