load('config.js');

function execute(key, page) {
    page = page || 1;
    page = parseInt(page, 10);
    var list = [];
    var nextPage = null;

    var searchUrl = API_URL + '/search/full/?keyword=' + encodeURIComponent(key) + '&page=' + page;
    var json = fetchJson(searchUrl);

    if (json && json.results && Array.isArray(json.results)) {
        for (var i = 0; i < json.results.length; i++) {
            var item = json.results[i];
            var link = item.link || (item.id ? ('/phim/' + (item.slug || ('anime-' + item.id)) + '/m' + item.id + '.html') : '');
            list.push({
                name: item.title || item.name || '',
                link: normalizeUrl(link),
                cover: item.poster_url || item.thumbnail || item.poster || item.cover_url || '',
                description: item.episode_name || (item.episodes_count ? (item.episodes_count + ' tập') : '') || item.status || '',
                host: BASE_URL
            });
        }

        if (json.total_pages && page < json.total_pages) {
            nextPage = page + 1;
        } else if (json.results.length >= 24) {
            nextPage = page + 1;
        }
    }

    return Response.success(list, nextPage);
}
