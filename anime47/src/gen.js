load('config.js');

function genreIdBySlug(slug) {
    var cached = storageGet('a47_genres');
    var genres = null;
    if (cached) { try { genres = JSON.parse(cached); } catch (e) { genres = null; } }
    if (!genres) {
        var j = fetchJson(API_URL + '/genres', false);
        genres = (j && j.data) ? j.data : j;
        if (genres && genres.length) storageSet('a47_genres', JSON.stringify(genres));
    }
    if (!genres) return '';
    for (var i = 0; i < genres.length; i++) {
        if (genres[i].slug === slug) return genres[i].id;
    }
    return '';
}

function fromFilter(query, page) {
    var json = fetchJson(API_URL + '/anime/filter?' + query + '&page=' + page, false);
    var data = json && json.data ? json.data : null;
    var posts = data && data.posts ? data.posts : [];
    var list = [];
    for (var i = 0; i < posts.length; i++) {
        var item = toItem(posts[i]);
        if (item) list.push(item);
    }
    var nextPage = '';
    var pag = data && data.pagination ? data.pagination : null;
    if (pag && pag.current_page && pag.last_page && pag.current_page < pag.last_page) {
        nextPage = String(page + 1);
    }
    return Response.success(list, nextPage);
}

function execute(url, page) {
    page = parseInt(page, 10) || 1;
    var input = (url || '') + '';

    // Home widgets now come from the API, not homepage SSR.
    var ssrKey = '';
    if (input === 'trending') ssrKey = 'trending-carousel';
    else if (input === 'top-airing') ssrKey = 'top-airing';
    else if (input === 'latest-completed') ssrKey = 'latest-completed';
    if (ssrKey) {
        if (page > 1) return Response.success([], '');
        var json = fetchJson(API_URL + '/home-page/' + ssrKey, false);
        var data = json && json.data ? json.data : json;
        if (data && data.length) {
            var items = [];
            for (var i = 0; i < data.length; i++) {
                var it = toItem(data[i]);
                if (it) items.push(it);
            }
            if (items.length) return Response.success(items, '');
        }
        return Response.error('Cannot load home section');
    }

    if (input === 'latest-episodes') return fromFilter('sort=latest', page);
    if (input === 'most-popular') return fromFilter('sort=views', page);
    if (input === 'danh-sach/anime-bo') return fromFilter('type=tv&sort=latest', page);
    if (input === 'danh-sach/anime-le') return fromFilter('type=movie&sort=latest', page);

    if (input.indexOf('the-loai/') === 0) {
        var gid = genreIdBySlug(input.substring(9));
        if (!gid) return Response.error('Không tìm thấy thể loại');
        return fromFilter('genres=' + gid + '&sort=latest', page);
    }

    return fromFilter('sort=latest', page);
}
