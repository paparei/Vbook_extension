load('config.js');

function execute(data) {
    var streamUrl = '';
    var kind = '';
    var rawSubs = [];
    try {
        var obj = JSON.parse(data);
        streamUrl = obj.url || '';
        kind = obj.type || '';
        rawSubs = obj.subs || [];
    } catch (e) {
        streamUrl = (data || '') + '';
    }
    if (!streamUrl) return Response.error('Không có luồng phát');

    // segments on cdn*.nonprofit.asia require this Referer
    var headers = {
        'User-Agent': UA,
        'Referer': BASE_URL + '/',
        'Origin': BASE_URL
    };

    // subtitles from the episode API: {file, label, default}
    // default track goes first so the player auto-selects it
    var subtitles = [];
    var legacySub = '';
    for (var pass = 0; pass < 2; pass++) {
        for (var s = 0; s < rawSubs.length; s++) {
            var sub = rawSubs[s];
            if (!sub || !sub.file) continue;
            var isDef = sub['default'] ? true : false;
            if ((pass === 0) !== isDef) continue;
            var file = sub.file + '';
            var lang = file.match(/\.([a-z]{2}(?:-[a-z0-9]+)?)\.vtt/i);
            subtitles.push({
                data: file,
                type: 'vtt',
                label: (sub.label || ('Sub ' + (s + 1))) + '',
                language: lang ? lang[1] : ''
            });
            if (isDef || !legacySub) legacySub = file;
        }
    }

    function native(url) {
        return Response.success({
            data: url,
            type: 'native',
            mimeType: 'application/x-mpegURL',
            headers: headers,
            host: BASE_URL,
            timeSkip: [],
            subtitles: subtitles,
            subtitle: legacySub,
            subtitleType: 'vtt'
        });
    }

    // jwplayer/hls masters from vlogphim serve #EXTM3U directly (no suffix needed).
    // Pass the master itself, exactly like the website's player does: the player
    // re-fetches it on playlist reloads, so signed variant/segment URLs stay fresh.
    // ponytail: if some future server returns a non-HLS URL here, it falls to 'auto'.
    if (kind !== 'page') {
        return native(streamUrl);
    }

    // Embed/unknown -> let VBook WebView sniff the media
    return Response.success({
        data: streamUrl,
        type: 'auto',
        headers: headers,
        host: BASE_URL,
        timeSkip: [],
        subtitles: subtitles,
        subtitle: legacySub,
        subtitleType: 'vtt'
    });
}
