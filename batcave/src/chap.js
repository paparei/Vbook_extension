load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!/\/reader\/\d+\/\d+(?:[/?#]|$)/i.test(url)) return Response.error('URL issue BatCave không hợp lệ');

    var response = fetchPage(url);
    var html = responseText(response);
    var error = pageResponseError(response, html, 'tải ảnh issue');
    if (error) return error;

    var images = pageImages(response.html(), html);
    return images.length ? Response.success(images) : Response.error('Không tìm thấy ảnh issue. Hãy mở Source page và đăng nhập lại.');
}
