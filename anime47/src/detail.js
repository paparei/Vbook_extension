load('config.js');

function execute(url) {
    var fullUrl = normalizeUrl(url);
    var html = fetchPage(fullUrl).text();
    var doc = Html.parse(html);
    var state = extractInitialState(html);

    var title = '';
    var cover = '';
    var description = '';
    var author = '';
    var ongoing = true;
    var genres = [];
    var suggests = [];
    var detailList = [];

    var animeData = null;
    if (state && state.queryCache && state.queryCache.queries) {
        for (var i = 0; i < state.queryCache.queries.length; i++) {
            var q = state.queryCache.queries[i];
            var qKey = (q.queryKey && q.queryKey[0]) || '';
            if (qKey.indexOf('anime-detail') !== -1 || qKey.indexOf('site-anime') !== -1 || qKey.indexOf('anime') !== -1) {
                if (q.state && q.state.data) {
                    animeData = q.state.data.data || q.state.data;
                    break;
                }
            }
        }
    }

    if (animeData) {
        title = animeData.title || animeData.name || '';
        cover = animeData.poster_url || animeData.cover_url || animeData.thumbnail || '';
        description = cleanText(animeData.description || animeData.synopsis || '');
        author = animeData.studio || animeData.author || animeData.director || 'Anime47';
        ongoing = animeData.status !== 'Completed' && animeData.status !== 'Hoàn thành';

        if (animeData.genres && Array.isArray(animeData.genres)) {
            for (var g = 0; g < animeData.genres.length; g++) {
                var genreObj = animeData.genres[g];
                var gName = genreObj.name || genreObj.title || genreObj;
                var gSlug = genreObj.slug || genreObj.id || gName;
                genres.push({
                    title: gName,
                    input: 'the-loai/' + gSlug,
                    script: 'gen.js'
                });
            }
        }

        if (animeData.type) detailList.push('Loại: ' + animeData.type);
        if (animeData.status) detailList.push('Trạng thái: ' + animeData.status);
        if (animeData.episodes_count) detailList.push('Số tập: ' + animeData.episodes_count);
        if (animeData.duration) detailList.push('Thời lượng: ' + animeData.duration);
        if (animeData.season) detailList.push('Mùa: ' + animeData.season);
        if (animeData.year) detailList.push('Năm: ' + animeData.year);
        if (animeData.rating) detailList.push('Đánh giá: ' + animeData.rating);

        if (animeData.related || animeData.recommendations || animeData.suggests) {
            var relList = animeData.related || animeData.recommendations || animeData.suggests || [];
            if (Array.isArray(relList)) {
                for (var r = 0; r < relList.length; r++) {
                    var rItem = relList[r];
                    var rLink = rItem.link || (rItem.id ? ('/phim/' + (rItem.slug || ('anime-' + rItem.id)) + '/m' + rItem.id + '.html') : '');
                    suggests.push({
                        title: rItem.title || rItem.name || '',
                        input: normalizeUrl(rLink),
                        script: 'detail.js'
                    });
                }
            }
        }
    }

    if (!title && doc) {
        title = doc.select('h1').text() || doc.select('.anime-title').text() || doc.select('title').text();
        cover = doc.select('meta[property=og:image]').attr('content') || doc.select('.movie-l-img img').attr('src');
        description = doc.select('.movie-detail-info, .description, #film-content').text();
        author = doc.select('.movie-dd:contains(Đạo diễn), .movie-dd:contains(Studio)').text() || 'Anime47';
    }

    var idMatch = fullUrl.match(/\/m(\d+)\.html/) || fullUrl.match(/\/(\d+)\/?$/);
    if (idMatch && (!genres.length || !suggests.length)) {
        var animeId = idMatch[1];
        var apiJson = fetchJson(API_URL + '/anime/' + animeId);
        if (apiJson) {
            var d = apiJson.data || apiJson;
            if (!title) title = d.title || d.name || '';
            if (!cover) cover = d.poster_url || d.cover_url || '';
            if (!description) description = cleanText(d.description || '');
            if (d.genres && Array.isArray(d.genres) && genres.length === 0) {
                for (var gi = 0; gi < d.genres.length; gi++) {
                    var gg = d.genres[gi];
                    genres.push({
                        title: gg.name || gg.title || gg,
                        input: 'the-loai/' + (gg.slug || gg.id || gg),
                        script: 'gen.js'
                    });
                }
            }
        }
    }

    return Response.success({
        name: title || 'Anime47',
        cover: cover,
        author: author || 'Anime47',
        description: description,
        detail: detailList.join('<br>'),
        ongoing: ongoing,
        genres: genres,
        suggests: suggests,
        host: BASE_URL
    });
}
