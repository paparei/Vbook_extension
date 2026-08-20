load('config.js');

function animeIdFromUrl(url) {
    var m = url.match(/m(\d+)\.html/) || url.match(/-(\d+)(?:\.html)?\/?$/);
    return m ? m[1] : '';
}

function findAnimeInState(state, id) {
    if (!state || !state.queryCache || !state.queryCache.queries) return null;
    var queries = state.queryCache.queries;
    for (var i = 0; i < queries.length; i++) {
        var q = queries[i];
        if (!q.state || !q.state.data) continue;
        var d = q.state.data.data || q.state.data;
        if (d && d.title && String(d.id) === String(id)) return d;
    }
    return null;
}

function execute(url) {
    url = normalizeUrl(url);
    var id = animeIdFromUrl(url);
    var d = null;

    if (id) {
        var j = fetchJson(API_URL + '/anime/info/' + id, true);
        if (j) d = j.data || j;
        if (!d || !d.title) {
            var state = extractInitialState(fetchHtml(url));
            d = findAnimeInState(state, id);
        }
    }
    if (!d || !d.title) return Response.error('Không tải được thông tin phim (cần đăng nhập tài khoản trong cài đặt)');

    var tags = [];
    var genres = d.genres || [];
    for (var i = 0; i < genres.length; i++) {
        var g = genres[i];
        var gName = (typeof g === 'string') ? g : (g.name || '');
        var gSlug = (typeof g === 'object' && g.slug) ? g.slug : '';
        if (!gName) continue;
        tags.push({
            title: gName + '',
            input: gSlug ? ('the-loai/' + gSlug) : gName,
            script: gSlug ? 'gen.js' : 'search.js'
        });
    }

    var status = (d.status || '') + '';
    var ongoing = status.toLowerCase().indexOf('ongoing') !== -1 || d.airing === true;
    // API returns episodes as {total, sub, dub}
    var epTotal = d.episodes && typeof d.episodes === 'object' ? d.episodes.total : d.episodes;
    var epInfo = epTotal ? (epTotal + ' tập') : '';

    return Response.success({
        name: d.title + '',
        author: (d.studios && d.studios.length ? d.studios[0].name : '') + '',
        cover: (d.poster || d.image || '') + '',
        description: cleanText(d.description || d.synopsis || ''),
        detail: epInfo + (status ? (' • ' + status) : '') + (d.type ? (' • ' + d.type) : ''),
        url: url,
        type: 'video',
        format: 'series',
        ongoing: ongoing,
        tags: tags,
        genres: [],
        suggests: [],
        comments: [{ title: 'Bình luận', input: id, script: 'comments.js' }]
    });
}
