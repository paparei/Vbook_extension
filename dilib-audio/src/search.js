load('config.js');

function execute(key, page) {
    key = trimText(key);
    if (!key) return Response.success([]);

    var current = pageNumber(page);
    var items = [];
    var next = false;
    [2, 3, 6].forEach(function (media) {
        var response = fetchPage(searchPageUrl(key, media, current));
        var html = responseText(response);
        if (!response || !response.ok || !html) return;

        var doc = response.html();
        mergeItems(items, parseAudioList(doc));
        if (hasNextPage(doc, current) || searchResultTotal(doc) > current * SEARCH_PAGE_SIZE) next = true;
    });

    if (!items.length) return Response.success([]);
    return Response.success(items, next ? String(current + 1) : '');
}
