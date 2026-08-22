load('config.js');
load('epub.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isBookUrl(url)) return Response.error('URL sách Dilib không hợp lệ');

    var response = fetchPage(url);
    if (!response) return Response.error(lastPageError || 'Không thể tải mục lục sách');
    if (!response.ok) return Response.error('Không thể tải mục lục sách' + (response.status ? ' (HTTP ' + response.status + ')' : ''));
    var html = responseText(response);
    if (!html) return Response.error(lastPageError || 'Dilib trả về trang trống');
    var epubUrl = epubDownloadUrl(response.html());
    if (!epubUrl) return Response.error('Sách này không có bản EPUB');

    try {
        var chapters = epubChapterList(fetchEpubBase64(epubUrl));
        return Response.success(chapters.map(function (chapter) {
            return {
                name: chapter.name,
                url: epubUrl + '#entry=' + encodeURIComponent(chapter.path),
                description: '',
                lock: false,
                pay: false
            };
        }));
    } catch (error) {
        return Response.error(error && error.message ? error.message : 'Không thể đọc mục lục EPUB');
    }
}
