load('config.js');

function execute(key, page) {
    key = trimText(key);
    if (!key) return Response.success([]);

    var current = pageNumber(page);
    var url = pagedUrl(BASE_URL + '/search/' + encodeURIComponent(key) + '/', current);

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tìm truyện');
    if (error) return error;

    var doc = response.html();
    return Response.success(parseComicList(doc), hasNextPage(doc, current) ? String(current + 1) : '');
}
