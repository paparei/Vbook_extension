load('config.js');

function execute(key, page) {
    page = parseInt(page, 10) || 1;
    var list = [];
    var nextPage = '';

    var json = fetchJson(API_URL + '/search/full/?keyword=' + encodeURIComponent(key) + '&page=' + page, false);
    if (!json || !Array.isArray(json.results)) return Response.error('Không tải được kết quả tìm kiếm');
    var results = json.results;

    for (var i = 0; i < results.length; i++) {
        var item = toItem(results[i]);
        if (item) list.push(item);
    }

    if (json.total_pages !== undefined && json.total_pages !== null) {
        if (page < parseInt(json.total_pages, 10)) nextPage = String(page + 1);
    } else if (results.length >= 24) {
        nextPage = String(page + 1);
    }

    return Response.success(list, nextPage);
}
