load('config.js');

function episodeIdFromUrl(url) {
    var m = url.match(/ep-\d+-(\d+)/) || url.match(/\/(\d+)(?:[\/?]|$)/);
    return m ? m[1] : '';
}

function execute(url) {
    url = normalizeUrl(url);
    var episodeId = episodeIdFromUrl(url);
    if (!episodeId) return Response.error('Không đọc được mã tập phim');

    var j = fetchJson(API_URL + '/anime/watch/episode/' + episodeId, true);
    var data = j ? (j.data || j) : null;
    var episode = data && data.episode ? data.episode : data;
    var streams = episode && episode.streams ? episode.streams : [];

    var tracks = [];
    for (var i = 0; i < streams.length; i++) {
        var s = streams[i];
        if (!s || !s.url) continue;
        var title = (s.server_name || s.label || s.provider || s.quality || ('Server ' + (i + 1))) + '';
        tracks.push({
            title: title,
            data: JSON.stringify({ url: s.url + '', type: (s.player_type || '') + '' })
        });
    }

    if (!tracks.length) {
        // Fallback: let the app sniff the stream from the watch page itself
        tracks.push({ title: 'Mặc định', data: JSON.stringify({ url: url, type: 'page' }) });
    }
    return Response.success(tracks);
}
