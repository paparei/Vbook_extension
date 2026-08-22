load('config.js');

function execute(url, page) {
    var response = fetchPage(pageUrl(url, page));
    if (!response.ok) return Response.error('HTTP ' + response.status);
    var doc = response.html();
    return Response.success(doc ? parseFilmItems(doc) : [], doc ? nextPage(doc, page) : '');
}
