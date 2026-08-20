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
    for (var pass = 0; pass < 2; pass++) {
        for (var si = 0; si < rawSubs.length; si++) {
            var sub = rawSubs[si];
            if (!sub || !sub.file || (!!sub['default']) !== (pass === 0)) continue;
            var file = sub.file + '';
            var lang = file.match(/[\/._-]([a-z]{2}(?:-[a-z0-9]+)?)\.vtt/i);
            subtitles.push({
                data: file,
                type: 'vtt',
                label: (sub.label || ('Sub ' + (subtitles.length + 1))) + '',
                language: lang ? lang[1] : ''
            });
        }
    }
    var legacySub = subtitles.length ? subtitles[0].data : '';

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

    function absolute(url, base) {
        if (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) return url;
        var origin = base.match(/^https?:\/\/[^\/]+/);
        if (url.charAt(0) === '/') return (origin ? origin[0] : '') + url;
        return base.substring(0, base.lastIndexOf('/') + 1) + url;
    }

    // vlogphim's HLS chunks are PNG followed by MPEG-TS. Give Media3 five clean TS
    // packets (including SDT/PAT/PMT) so it selects and reuses the TS extractor even
    // when playback starts after a seek. Only one four-byte CDN probe is needed.
    // ponytail: assumes each wrapped chunk starts with SDT/PAT/PMT. Rewrite every
    // chunk only if the provider changes that TS prefix.
    function resolveVariant(masterUrl) {
        try {
            var res = fetch(masterUrl, { method: 'GET', headers: headers, timeout: 15000 });
            if (!res || !res.ok || !res.text) return '';
            var text = res.text() || '';
            if (text.indexOf('#EXTM3U') === -1) return '';
            var lines = text.split('\n');
            var variant = '';
            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] + '').replace(/^\s+|\s+$/g, '');
                if (line && line.charAt(0) !== '#') {
                    variant = absolute(line, masterUrl) + '.m3u8';
                    break;
                }
            }
            if (!variant) return '';

            res = fetch(variant, { method: 'GET', headers: headers, timeout: 15000 });
            if (!res || !res.ok || !res.text) return variant;
            text = res.text() || '';
            if (text.indexOf('#EXTM3U') === -1) return variant;
            lines = text.split('\n');
            var first = -1;
            for (i = 0; i < lines.length; i++) {
                line = (lines[i] + '').replace(/^\s+|\s+$/g, '');
                if (!line || line.charAt(0) === '#') continue;
                lines[i] = absolute(line, variant);
                if (first === -1) first = i;
            }
            if (first === -1) return variant;
            var segment = lines[first];
            var probeHeaders = {
                'User-Agent': UA,
                'Referer': BASE_URL + '/',
                'Origin': BASE_URL,
                'Range': 'bytes=54-57'
            };
            var probe = fetch(segment, { method: 'GET', headers: probeHeaders, timeout: 15000 });
            var b64 = probe && probe.ok && probe.base64 ? probe.base64() : '';
            var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            if (b64.length < 6) return variant;
            var offset = (alphabet.indexOf(b64.charAt(0)) * 4 + Math.floor(alphabet.indexOf(b64.charAt(1)) / 16)) * 16777216 + ((alphabet.indexOf(b64.charAt(1)) & 15) * 16 + Math.floor(alphabet.indexOf(b64.charAt(2)) / 4)) * 65536 + ((alphabet.indexOf(b64.charAt(2)) & 3) * 64 + alphabet.indexOf(b64.charAt(3))) * 256 + alphabet.indexOf(b64.charAt(4)) * 4 + Math.floor(alphabet.indexOf(b64.charAt(5)) / 16) + 78;
            if (!(offset > 78)) return variant;
            lines[first] = '#EXT-X-MAP:URI="' + segment + '",BYTERANGE="940@' + offset + '"\n' + segment;
            return 'data:application/vnd.apple.mpegurl,' + encodeURIComponent(lines.join('\n'));
        } catch (e) { }
        return '';
    }

    if (streamUrl.indexOf('.mp4') !== -1 || streamUrl.indexOf('.m3u8') !== -1) {
        return native(streamUrl);
    }

    if (kind !== 'page') {
        var variant = resolveVariant(streamUrl);
        if (variant) return native(variant);
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
