load('config.js');

// ponytail: vlogphim master URLs have no extension, so players can't infer HLS.
// We fetch the master playlist, take the first variant and append ".m3u8" (server accepts it).
// Upgrade: pick variant by bandwidth if multi-quality masters appear.
function resolveVariant(masterUrl, headers) {
    try {
        var res = fetch(masterUrl, { method: 'GET', headers: headers, timeout: 15000 });
        var text = res && res.text ? (res.text() || '') : '';
        if (text.indexOf('#EXTM3U') === -1) return '';
        var origin = masterUrl.match(/^https?:\/\/[^\/]+/);
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var line = (lines[i] + '').replace(/\s+$/, '');
            if (!line || line.charAt(0) === '#') continue;
            if (line.indexOf('http://') === 0 || line.indexOf('https://') === 0) return line;
            return (origin ? origin[0] : '') + (line.charAt(0) === '/' ? line : '/' + line);
        }
    } catch (e) { }
    return '';
}

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
    var subtitles = [];
    var legacySub = '';
    for (var s = 0; s < rawSubs.length; s++) {
        var sub = rawSubs[s];
        if (!sub || !sub.file) continue;
        var file = sub.file + '';
        var lang = file.match(/\.([a-z]{2}(?:-[a-z0-9]+)?)\.vtt/i);
        subtitles.push({
            data: file,
            type: 'vtt',
            label: (sub.label || ('Sub ' + (s + 1))) + '',
            language: lang ? lang[1] : ''
        });
        // legacy single-subtitle fields for older VBook builds (default track wins)
        if (!legacySub || sub['default']) legacySub = file;
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

    if (streamUrl.indexOf('.mp4') !== -1 || streamUrl.indexOf('.m3u8') !== -1) {
        return native(streamUrl);
    }

    if (kind !== 'page') {
        var variant = resolveVariant(streamUrl, headers);
        if (variant) {
            return native(variant + '.m3u8');
        }
        if (kind === 'hls' || kind === 'jwplayer') {
            return native(streamUrl + (streamUrl.indexOf('?') === -1 ? '?' : '&') + 'f=.m3u8');
        }
    }

    // Embed/unknown -> let VBook WebView sniff the media
    return Response.success({
        data: streamUrl,
        type: 'auto',
        headers: headers,
        host: BASE_URL,
        timeSkip: []
    });
}
