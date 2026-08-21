load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isSeriesUrl(url)) return Response.error('URL truyện BatCave không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải danh sách issue');
    if (error) return error;

    var chapters = readerLinks(response.html(), html);
    return chapters.length ? Response.success(chapters) : Response.error('Không tìm thấy issue. Cookie BatCave có thể đã hết hạn.');
}
