load('config.js');

function execute(url) {
    var chapterId = uuidFromUrl(url, 'chapter');
    if (!chapterId) return Response.error('URL chương MangaDex không hợp lệ');

    var data = apiRequest('/at-home/server/' + chapterId, []);
    if (!data || !data.baseUrl || !data.chapter || !data.chapter.hash) {
        return apiError('Không tải được ảnh chương');
    }

    var files = data.chapter.data || [];
    var images = [];
    for (var i = 0; i < files.length; i++) {
        images.push(data.baseUrl + '/data/' + data.chapter.hash + '/' + encodeURIComponent(files[i]));
    }
    return images.length ? Response.success(images) : Response.error('Chương không có ảnh');
}
