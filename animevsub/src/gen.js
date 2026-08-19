load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    url = normalizeUrl(url).replace(/\/$/, '');
    var fetchUrl = url;
    if (parseInt(page, 10) > 1) {
        fetchUrl = url + '/page/' + page + '/';
    }

    var response = fetchPage(fetchUrl);
    if (!response.ok) return Response.error('HTTP ' + response.status);

    var doc = response.html();
    var list = parseMovieList(doc);

    // only advance while the site itself offers a next page
    var next = hasNextPage(doc) ? (parseInt(page, 10) + 1).toString() : '';
    return Response.success(list, next);
}
