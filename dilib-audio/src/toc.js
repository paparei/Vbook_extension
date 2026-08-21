load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isItemUrl(url)) return Response.error('URL sách nói Dilib không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải audio');
    if (error) return error;
    if (!audioUrl(response.html())) return Response.error('Mục này không có audio MP3 trên Dilib');

    return Response.success([{ name: 'Nghe toàn bộ', url: url, host: BASE_URL }]);
}
