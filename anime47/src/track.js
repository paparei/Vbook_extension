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

    // Subtitle contract: { data, type, label, language } with data AS A URL -
    // the player drops data: URIs (no CC button, v15). anime47.love serves the
    // VTTs from signed URLs (?expires&signature) open to any UA/referer, so the
    // player can fetch them bare; no per-entry headers needed (and the player
    // may not honor them anyway).
    // ponytail: provider may stop signing/serving subs on anime47.love and move
    // them behind the CDN Referer gate again. Upgrade: pre-download to a data URL
    // only if that happens (but then CC disappears - see v15).
    var subtitles = [];
    for (var si = 0; si < rawSubs.length; si++) {
        var sub = rawSubs[si];
        if (!sub || !sub.file) continue;
        var file = sub.file + '';
        var lang = file.match(/[\/._-]([a-z]{2}(?:-[a-z0-9]+)?)\.vtt/i);
        subtitles.push({
            data: file,
            type: 'vtt',
            label: (sub.label || ('Sub ' + (subtitles.length + 1))) + '',
            language: lang ? lang[1] : ''
        });
    }

    function native(url) {
        return Response.success({
            data: url,
            type: 'native',
            mimeType: 'application/x-mpegURL',
            headers: headers,
            host: BASE_URL,
            timeSkip: [],
            subtitles: subtitles
        });
    }

    // vlogphim master URLs have no extension, so VBook's native player can't identify
    // them as HLS and rejects them. The master accepts no .m3u8 suffix (500), but the
    // first variant playlist does. Fetch the master, take the variant, append ".m3u8".
    // ponytail: pick variant by bandwidth if multi-quality masters appear.
    function resolveVariant(masterUrl) {
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

    if (streamUrl.indexOf('.mp4') !== -1 || streamUrl.indexOf('.m3u8') !== -1) {
        return native(streamUrl);
    }

    if (kind !== 'page') {
        var variant = resolveVariant(streamUrl);
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
        timeSkip: [],
        subtitles: subtitles
    });
}
