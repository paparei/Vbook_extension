load('config.js');

function execute(data) {
    var obj = {};
    var streamUrl = '';
    var kind = '';
    var rawSubs = [];
    try {
        obj = JSON.parse(data);
        streamUrl = obj.url || '';
        kind = obj.type || '';
        rawSubs = obj.subs || []; // legacy handles created before v21
    } catch (e) {
        streamUrl = (data || '') + '';
    }

    function titleOf(stream, index) {
        return (stream.server_name || stream.label || stream.provider || stream.quality || ('Server ' + (index + 1))) + '';
    }

    // Chapter results may be cached longer than Anime47's signed VTT URLs. Resolve
    // the stable episode/server handle again immediately before playback.
    if (obj.episodeId) {
        var fresh = fetchJson(API_URL + '/anime/watch/episode/' + obj.episodeId, true);
        var freshData = fresh ? (fresh.data || fresh) : null;
        var episode = freshData && freshData.episode ? freshData.episode : freshData;
        var streams = episode && episode.streams ? episode.streams : [];
        var selected = null;
        var index = parseInt(obj.streamIndex, 10);
        if (index >= 0 && index < streams.length) selected = streams[index];
        if (obj.server && (!selected || titleOf(selected, index) !== obj.server)) {
            for (var sm = 0; sm < streams.length; sm++) {
                if (titleOf(streams[sm], sm) === obj.server) {
                    selected = streams[sm];
                    break;
                }
            }
        }
        if (selected && selected.url) {
            streamUrl = selected.url + '';
            kind = (selected.player_type || 'hls') + '';
        }

        rawSubs = [];
        var seenRaw = {};
        for (var st = 0; st < streams.length; st++) {
            var serverSubs = streams[st] && streams[st].subtitles ? streams[st].subtitles : [];
            for (var rs = 0; rs < serverSubs.length; rs++) {
                var rawFile = serverSubs[rs] && serverSubs[rs].file ? serverSubs[rs].file + '' : '';
                if (!rawFile || seenRaw[rawFile]) continue;
                seenRaw[rawFile] = 1;
                rawSubs.push(serverSubs[rs]);
            }
        }
    }
    if (!streamUrl) return Response.error('Không có luồng phát');

    // Direct VlogPhim segments require these headers. A configured proxy applies
    // them upstream and harmlessly ignores them from the player.
    var headers = {
        'User-Agent': UA,
        'Referer': BASE_URL + '/',
        'Origin': BASE_URL
    };

    function subLanguage(sub) {
        var file = (sub.file || '') + '';
        var match = file.match(/[\/._-]([a-z]{2}(?:-[a-z0-9]+)?)\.vtt/i);
        return match ? match[1].toLowerCase() : '';
    }

    function subPriority(sub) {
        var label = ((sub && sub.label) || '').toLowerCase();
        if (subLanguage(sub) === 'vi' || label.indexOf('việt') !== -1 || label.indexOf('viet') !== -1) return 0;
        return sub && sub['default'] ? 1 : 2;
    }

    // Keep URL-based entries: VBook drops data: subtitle URIs. Vietnamese is
    // first even when Anime47 incorrectly marks English as the default track.
    var subtitles = [];
    var seenSubs = {};
    for (var pass = 0; pass < 3; pass++) {
        for (var si = 0; si < rawSubs.length; si++) {
            var sub = rawSubs[si];
            if (!sub || !sub.file || subPriority(sub) !== pass) continue;
            var file = sub.file + '';
            if (seenSubs[file]) continue;
            seenSubs[file] = 1;
            var language = subLanguage(sub);
            subtitles.push({
                data: file,
                type: 'vtt',
                label: (sub.label || ('Sub ' + (subtitles.length + 1))) + '',
                language: language
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

    function isVlogPhim(url) {
        return /^https:\/\/pl\.vlogphim\.net\//i.test(url);
    }

    function proxyTarget(url) {
        var proxy = configText('a47_proxy');
        if (!/^https:\/\//i.test(proxy)) return '';
        return proxy + (proxy.indexOf('?') === -1 ? '?' : '&') + 'url=' + encodeURIComponent(url);
    }

    // VlogPhim's master URL has no extension, but its variant accepts .m3u8.
    // ponytail: direct fallback still relies on Media3 parsing PNG-wrapped TS;
    // deploy/configure proxy-worker.mjs to remove that ceiling.
    function resolveVariant(masterUrl) {
        try {
            var res = fetch(masterUrl, { method: 'GET', headers: headers, timeout: 15000 });
            if (!res || !res.ok || !res.text) return '';
            var text = res.text() || '';
            if (text.indexOf('#EXTM3U') === -1) return '';
            var lines = text.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] + '').replace(/^\s+|\s+$/g, '');
                if (line && line.charAt(0) !== '#') return absolute(line, masterUrl) + '.m3u8';
            }
        } catch (e) { }
        return '';
    }

    if (isVlogPhim(streamUrl)) {
        var proxied = proxyTarget(streamUrl);
        if (proxied) return native(proxied);
    }

    if (streamUrl.indexOf('.mp4') !== -1 || streamUrl.indexOf('.m3u8') !== -1) return native(streamUrl);

    if (kind !== 'page') {
        var variant = resolveVariant(streamUrl);
        if (variant) return native(variant);
        if (kind === 'hls' || kind === 'jwplayer') {
            return native(streamUrl + (streamUrl.indexOf('?') === -1 ? '?' : '&') + 'f=.m3u8');
        }
    }

    // Embed/unknown -> let VBook WebView sniff the media.
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
