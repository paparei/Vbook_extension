load('config.js');

function execute(key, page) {
    key = cleanText(key);
    if (!key) return Response.success([]);
    var url = BASE_URL + '/?search=' + encodeURIComponent(key);
    var number = parseInt(page, 10);
    if (number > 1) url += '&page=' + number;
    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP ' + response.status);
    var doc = response.html();
    return Response.success(doc ? parseFilmItems(doc) : [], doc ? nextPage(doc, page) : '');
}
