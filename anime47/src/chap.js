load('config.js');

function execute(url) {
    var fullUrl = normalizeUrl(url);
    var servers = [];

    var epMatch = fullUrl.match(/ep-(\d+)/) || fullUrl.match(/episode[/-](\d+)/) || fullUrl.match(/(\d+)\.html/);
    var episodeId = epMatch ? epMatch[1] : null;

    if (episodeId) {
        var streamApiJson = fetchJson(API_URL + '/anime/watch/episode/' + episodeId);
        if (streamApiJson) {
            var streamData = streamApiJson.data || streamApiJson;
            if (streamData.sources && Array.isArray(streamData.sources)) {
                for (var i = 0; i < streamData.sources.length; i++) {
                    var src = streamData.sources[i];
                    var srcUrl = src.url || src.file || src.link;
                    if (srcUrl) {
                        servers.push({
                            title: src.name || src.label || ('Server ' + (i + 1)),
                            data: JSON.stringify({
                                url: srcUrl,
                                type: src.type || (srcUrl.indexOf('.m3u8') !== -1 ? 'native' : 'auto'),
                                referer: BASE_URL
                            })
                        });
                    }
                }
            } else if (streamData.stream_url || streamData.url || streamData.m3u8) {
                var directUrl = streamData.stream_url || streamData.url || streamData.m3u8;
                servers.push({
                    title: "VIP Server",
                    data: JSON.stringify({
                        url: directUrl,
                        type: directUrl.indexOf('.m3u8') !== -1 ? 'native' : 'auto',
                        referer: BASE_URL
                    })
                });
            }
        }
    }

    if (servers.length === 0) {
        var html = fetchPage(fullUrl).text();
        var state = extractInitialState(html);

        if (state && state.queryCache && state.queryCache.queries) {
            for (var j = 0; j < state.queryCache.queries.length; j++) {
                var q = state.queryCache.queries[j];
                var qKey = (q.queryKey && q.queryKey[0]) || '';
                if (qKey.indexOf('watch') !== -1 || qKey.indexOf('stream') !== -1 || qKey.indexOf('sources') !== -1) {
                    if (q.state && q.state.data) {
                        var watchData = q.state.data.data || q.state.data;
                        if (watchData.stream_url || watchData.url) {
                            var sUrl = watchData.stream_url || watchData.url;
                            servers.push({
                                title: "Default Server",
                                data: JSON.stringify({
                                    url: sUrl,
                                    type: sUrl.indexOf('.m3u8') !== -1 ? 'native' : 'auto',
                                    referer: BASE_URL
                                })
                            });
                        }
                    }
                }
            }
        }

        if (servers.length === 0) {
            var doc = Html.parse(html);
            if (doc) {
                var iframeSrc = doc.select('iframe#player-iframe, iframe.player-iframe, .player iframe').attr('src');
                if (iframeSrc) {
                    servers.push({
                        title: "Embed Player",
                        data: JSON.stringify({
                            url: normalizeUrl(iframeSrc),
                            type: 'embed',
                            referer: fullUrl
                        })
                    });
                }
            }
        }
    }

    if (servers.length === 0) {
        servers.push({
            title: "Anime47 Direct Web Player",
            data: JSON.stringify({
                url: fullUrl,
                type: 'embed',
                referer: BASE_URL
            })
        });
    }

    return Response.success(servers);
}
