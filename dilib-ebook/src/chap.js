load('config.js');
load('epub.js');

function execute(url) {
    url = String(url || '');
    var match = url.match(/^(.*)#entry=([^#]+)$/);
    if (!match) return Response.error('Đường dẫn phần EPUB không hợp lệ');
    var epubUrl = normalizePageUrl(match[1]);
    if (!isEpubUrl(epubUrl)) return Response.error('URL EPUB Dilib không hợp lệ');

    var path;
    try {
        path = decodeURIComponent(match[2]);
        var chapter = epubChapterContent(fetchEpubBase64(epubUrl), path);
        return Response.success(chapter.html, chapter.title);
    } catch (error) {
        return Response.error(error && error.message ? error.message : 'Không thể đọc phần EPUB');
    }
}
