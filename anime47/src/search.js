load('config.js');

function execute(key, page) {
    page = parseInt(page, 10) || 1;
    var list = [];
    var nextPage = null;

    var json = fetchJson(API_URL + '/search/full/?keyword=' + encodeURIComponent(key) + '&page=' + page, false);
    var results = json && json.results ? json.results : [];

    for (var i = 0; i < results.length; i++) {
        var item = toItem(results[i]);
        if (item) list.push(item);
    }

    if (json && json.total_pages && page < json.total_pages) {
        nextPage = String(page + 1);
    } else if (results.length >= 24) {
        nextPage = String(page + 1);
    }

    return Response.success(list, nextPage);
}
