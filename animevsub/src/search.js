load('config.js');

function execute(key, page) {
    // ponytail: site ignores search pagination (/page/N/?s= repeats page 1) — single page only
    var url = BASE_URL + '/?s=' + encodeURIComponent(key);

    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP ' + response.status);

    return Response.success(parseMovieList(response.html()));
}
