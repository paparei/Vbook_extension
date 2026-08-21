load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isSeriesUrl(url)) return Response.error('URL truyện Dilib không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải danh sách chapter');
    if (error) return error;

    var chapters = chapterLinks(response.html());
    chapters.sort(function (left, right) {
        var a = parseInt((left.url.match(/-chap-(\d+)\.html/i) || [0, 0])[1], 10);
        var b = parseInt((right.url.match(/-chap-(\d+)\.html/i) || [0, 0])[1], 10);
        return a - b;
    });
    return chapters.length ? Response.success(chapters) : Response.error('Không tìm thấy chapter truyện tranh');
}
