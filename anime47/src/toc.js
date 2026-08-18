load('config.js');

function execute(url) {
    var fullUrl = normalizeUrl(url);
    var list = [];

    var idMatch = fullUrl.match(/\/m(\d+)\.html/) || fullUrl.match(/\/(\d+)\/?$/);
    var animeId = idMatch ? idMatch[1] : null;

    var html = fetchPage(fullUrl).text();
    var state = extractInitialState(html);

    if (state && state.queryCache && state.queryCache.queries) {
        for (var i = 0; i < state.queryCache.queries.length; i++) {
            var q = state.queryCache.queries[i];
            var qKey = (q.queryKey && q.queryKey[0]) || '';
            if (qKey.indexOf('episodes') !== -1 || qKey.indexOf('episode-list') !== -1) {
                if (q.state && q.state.data) {
                    var epData = q.state.data.data || q.state.data;
                    if (Array.isArray(epData)) {
                        for (var j = 0; j < epData.length; j++) {
                            var ep = epData[j];
                            var epName = ep.name || ep.title || ('Tập ' + (ep.episode_number || (j + 1)));
                            var epLink = ep.link || (ep.id ? ('/xem-phim/' + (ep.slug || ('ep-' + ep.id)) + '/ep-' + ep.id + '.html') : '');
                            list.push({
                                name: epName,
                                url: normalizeUrl(epLink),
                                host: BASE_URL
                            });
                        }
                    }
                    break;
                }
            }
        }
    }

    if (list.length === 0 && animeId) {
        var epApiJson = fetchJson(API_URL + '/anime/' + animeId + '/episodes');
        if (epApiJson) {
            var eps = epApiJson.data || epApiJson.episodes || epApiJson;
            if (Array.isArray(eps)) {
                for (var k = 0; k < eps.length; k++) {
                    var item = eps[k];
                    var eName = item.name || item.title || ('Tập ' + (item.episode_number || (k + 1)));
                    var eLink = item.link || (item.id ? ('/xem-phim/watch/ep-' + item.id + '.html') : '');
                    list.push({
                        name: eName,
                        url: normalizeUrl(eLink),
                        host: BASE_URL
                    });
                }
            }
        }
    }

    if (list.length === 0) {
        var doc = Html.parse(html);
        if (doc) {
            var epNodes = doc.select('.list-episode a, .server-item a, #list-episodes a');
            for (var m = 0; m < epNodes.size(); m++) {
                var el = epNodes.get(m);
                var aName = el.text();
                var aHref = el.attr('href');
                if (aHref) {
                    list.push({
                        name: aName || ('Tập ' + (m + 1)),
                        url: normalizeUrl(aHref),
                        host: BASE_URL
                    });
                }
            }
        }
    }

    if (list.length === 0) {
        list.push({
            name: "Xem Phim (Tập Full)",
            url: fullUrl,
            host: BASE_URL
        });
    }

    return Response.success(list);
}
