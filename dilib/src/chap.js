load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isChapterUrl(url)) return Response.error('URL chapter Dilib không hợp lệ');

    var response = fetchPage(url, url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải ảnh chapter');
    if (error) return error;

    var images = comicImages(response.html());
    return images.length ? Response.success(images) : Response.error('Không tìm thấy ảnh chapter');
}
