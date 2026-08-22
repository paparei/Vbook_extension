load('config.js');

function execute(key, page) {
    key = trimText(key);
    if (!key) return Response.success([]);

    var current = pageNumber(page);
    var response = fetchPage(searchPageUrl(key, current));
    if (!response) return Response.error(lastPageError || 'Không thể tìm sách điện tử');
    if (!response.ok) return Response.error('Không thể tìm sách điện tử' + (response.status ? ' (HTTP ' + response.status + ')' : ''));
    var html = responseText(response);
    if (!html) return Response.error(lastPageError || 'Dilib trả về trang trống');

    var doc = response.html();
    var items = parseBookList(doc);
    var total = searchResultTotal(doc);
    var next = hasNextPage(doc, current) || total > current * SEARCH_PAGE_SIZE ? String(current + 1) : '';
    return Response.success(items, next);
}
