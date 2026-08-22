load('config.js');

function execute(key, page) {
    key = trimText(key);
    var current = pageNumber(page);
    Log.log('dilib-ebook search: ' + (key ? 'query' : 'browse') + ' page ' + current);
    var response = fetchPage(searchPageUrl(key, current));
    if (!response) return Response.error(lastPageError || 'Không thể tìm sách điện tử');
    if (!response.ok) return Response.error('Không thể tìm sách điện tử' + (response.status ? ' (HTTP ' + response.status + ')' : ''));
    var html = responseText(response);
    if (!html) return Response.error(lastPageError || 'Dilib trả về trang trống');

    var doc = response.html();
    var candidates = parseBookList(doc);
    var items = candidates.filter(function (item) {
        var detail = fetchPage(item.link);
        if (!detail || !detail.ok) return false;
        try { return !!epubDownloadUrl(detail.html()); } catch (error) { return false; }
    });
    Log.log('dilib-ebook search: kept ' + items.length + ' of ' + candidates.length + ' EPUB books');
    var total = searchResultTotal(doc);
    var next = hasNextPage(doc, current) || total > current * SEARCH_PAGE_SIZE ? String(current + 1) : '';
    return Response.success(items, next);
}
