load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isItemUrl(url)) return Response.error('URL audio Dilib không hợp lệ');

    var response = fetchPage(url, url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải audio');
    if (error) return error;

    var mediaUrl = audioUrl(response.html());
    if (!mediaUrl) return Response.error('Không tìm thấy audio MP3 trên Dilib');
    return Response.success({
        type: 'native',
        data: mediaUrl,
        host: BASE_URL,
        mimeType: 'audio/mpeg',
        headers: {
            'Referer': url,
            'User-Agent': BASE_UA
        }
    });
}
