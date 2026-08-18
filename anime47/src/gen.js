load('config.js');

function execute(url, page) {
    page = page || 1;
    page = parseInt(page, 10);
    var list = [];
    var nextPage = null;

    var searchUrl = API_URL + '/search/full/?page=' + page;

    if (url === 'trending') {
        searchUrl += '&sort=trending';
    } else if (url === 'top-airing') {
        searchUrl += '&status=airing&sort=top';
    } else if (url === 'most-popular') {
        searchUrl += '&sort=popular';
    } else if (url === 'latest-completed') {
        searchUrl += '&status=completed';
    } else if (url === 'latest-episodes') {
        searchUrl += '&sort=latest';
    } else if (url.indexOf('the-loai/') === 0) {
        var genreSlug = url.replace('the-loai/', '');
        searchUrl += '&genres=' + encodeURIComponent(genreSlug);
    } else if (url === 'danh-sach/anime-bo') {
        searchUrl += '&type=series';
    } else if (url === 'danh-sach/anime-le') {
        searchUrl += '&type=movie';
    } else if (url && url.indexOf('http') !== 0 && url.indexOf('/') === -1) {
        searchUrl += '&keyword=' + encodeURIComponent(url);
    } else if (url && url.indexOf('http') === 0) {
        searchUrl = url;
    }

    var json = fetchJson(searchUrl);
    if (json && json.results && Array.isArray(json.results) && json.results.length > 0) {
        for (var k = 0; k < json.results.length; k++) {
            var resItem = json.results[k];
            var resLink = resItem.link || (resItem.id ? ('/phim/' + (resItem.slug || ('anime-' + resItem.id)) + '/m' + resItem.id + '.html') : '');
            list.push({
                name: resItem.title || resItem.name || '',
                link: normalizeUrl(resLink),
                cover: resItem.poster_url || resItem.thumbnail || resItem.poster || resItem.cover_url || '',
                description: resItem.episode_name || (resItem.episodes_count ? (resItem.episodes_count + ' tập') : '') || resItem.status || '',
                host: BASE_URL
            });
        }

        if (json.total_pages && page < json.total_pages) {
            nextPage = page + 1;
        } else if (json.results.length >= 24) {
            nextPage = page + 1;
        }
    }

    if (list.length === 0) {
        var homeHtml = fetchPage(BASE_URL).text();
        var state = extractInitialState(homeHtml);

        if (state && state.queryCache && state.queryCache.queries) {
            var queries = state.queryCache.queries;
            for (var i = 0; i < queries.length; i++) {
                var q = queries[i];
                var qKey = (q.queryKey && q.queryKey[0]) || '';
                var isMatch = false;

                if (url === 'trending' && qKey.indexOf('trending-carousel') !== -1) isMatch = true;
                else if (url === 'top-airing' && qKey.indexOf('top-airing') !== -1) isMatch = true;
                else if (url === 'most-popular' && qKey.indexOf('most-popular') !== -1) isMatch = true;
                else if (url === 'latest-completed' && qKey.indexOf('latest-completed') !== -1) isMatch = true;
                else if (url === 'latest-episodes' && qKey.indexOf('latest-episodes') !== -1) isMatch = true;
                else if (q.state && q.state.data && (q.state.data.data || q.state.data) && (q.state.data.data || q.state.data).length > 0) isMatch = true;

                if (isMatch && q.state && q.state.data) {
                    var items = q.state.data.data || q.state.data;
                    if (Array.isArray(items)) {
                        for (var j = 0; j < items.length; j++) {
                            var item = items[j];
                            var link = item.link || (item.id ? ('/phim/' + (item.slug || ('anime-' + item.id)) + '/m' + item.id + '.html') : '');
                            list.push({
                                name: item.title || item.name || '',
                                link: normalizeUrl(link),
                                cover: item.poster_url || item.thumbnail || item.poster || item.cover_url || item.cover || '',
                                description: item.latest_episode_name || item.episode_name || (item.episodes_count ? (item.episodes_count + ' tập') : '') || item.year || '',
                                host: BASE_URL
                            });
                        }
                    }
                    break;
                }
            }
        }
    }

    if (list.length === 0) {
        var searchUrl = API_URL + '/search/full/?page=' + page;
        if (url.indexOf('the-loai/') === 0) {
            var genreSlug = url.replace('the-loai/', '');
            searchUrl += '&genres=' + encodeURIComponent(genreSlug);
        } else if (url === 'danh-sach/anime-bo') {
            searchUrl += '&type=series';
        } else if (url === 'danh-sach/anime-le') {
            searchUrl += '&type=movie';
        } else if (url && url.indexOf('http') !== 0 && url.indexOf('/') === -1) {
            searchUrl += '&keyword=' + encodeURIComponent(url);
        } else if (url && url.indexOf('http') === 0) {
            searchUrl = url;
        }

        var json = fetchJson(searchUrl);
        if (json && json.results && Array.isArray(json.results)) {
            for (var k = 0; k < json.results.length; k++) {
                var resItem = json.results[k];
                var resLink = resItem.link || (resItem.id ? ('/phim/' + (resItem.slug || ('anime-' + resItem.id)) + '/m' + resItem.id + '.html') : '');
                list.push({
                    name: resItem.title || resItem.name || '',
                    link: normalizeUrl(resLink),
                    cover: resItem.poster_url || resItem.thumbnail || resItem.poster || resItem.cover_url || '',
                    description: resItem.episode_name || (resItem.episodes_count ? (resItem.episodes_count + ' tập') : '') || resItem.status || '',
                    host: BASE_URL
                });
            }

            if (json.total_pages && page < json.total_pages) {
                nextPage = page + 1;
            } else if (json.results.length >= 24) {
                nextPage = page + 1;
            }
        }
    }

    return Response.success(list, nextPage);
}
