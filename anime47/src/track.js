load('config.js');

function execute(data) {
    var obj = {};
    var streamUrl = '';
    var kind = '';
    var rawSubs = [];
    try {
        obj = JSON.parse(data);
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return Response.error('Invalid playback data');
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
    if (obj.episodeId && kind !== 'page') {
        if (!/^\d+$/.test(String(obj.episodeId))) return Response.error('Mã tập phim không hợp lệ');
        var fresh = fetchJson(API_URL + '/anime/watch/episode/' + obj.episodeId, true);
        if (!fresh) return Response.error('Không tải được luồng phát mới (kiểm tra đăng nhập và kết nối)');
        var freshData = fresh.data || fresh;
        var episode = freshData && freshData.episode ? freshData.episode : freshData;
        var streams = episode && Array.isArray(episode.streams) ? episode.streams : [];
        var selected = null;
        var index = parseInt(obj.streamIndex, 10);
        if (index >= 0 && index < streams.length) selected = streams[index];
        if (obj.server && (!selected || titleOf(selected, index) !== obj.server)) {
            selected = null;
            for (var sm = 0; sm < streams.length; sm++) {
                if (streams[sm] && titleOf(streams[sm], sm) === obj.server) {
                    selected = streams[sm];
                    break;
                }
            }
        }
        if (selected && selected.url) {
            streamUrl = selected.url + '';
            kind = (selected.player_type || 'hls') + '';
        } else if (kind !== 'page') {
            return Response.error('Máy chủ đã chọn không còn luồng phát');
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
    if (typeof streamUrl !== 'string' || !/^https?:\/\/[^\s\/@?#\\]+(?:[\/?#][^\s\\]*)?$/i.test(streamUrl)) {
        return Response.error('URL luồng phát không hợp lệ');
    }
    if (!Array.isArray(rawSubs)) rawSubs = [];

    // These headers also apply to direct playlist and segment requests.
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
            mimeType: /\.mp4(?:[?#]|$)/i.test(url) ? 'video/mp4' : 'application/x-mpegURL',
            headers: headers,
            host: BASE_URL,
            timeSkip: [],
            subtitles: subtitles,
            subtitle: legacySub,
            subtitleType: 'vtt'
        });
    }

    function absolute(url, base) {
        if (/^https?:\/\//i.test(url)) return url;
        if (url.indexOf('//') === 0) return base.split(':')[0] + ':' + url;
        base = base.split(/[?#]/)[0];
        var origin = base.match(/^https?:\/\/[^\/]+/);
        if (url.charAt(0) === '/') return (origin ? origin[0] : '') + url;
        return base.substring(0, base.lastIndexOf('/') + 1) + url;
    }

    function isVlogPhim(url) {
        return /^https:\/\/pl\.vlogphim\.net\//i.test(url);
    }

    function proxyTarget(url) {
        var proxy = configText('a47_proxy_url');
        if (!/^https:\/\/[^\s\/@?#\\]+(?:[\/?][^\s#\\]*)?$/i.test(proxy)) return '';
        var queryAt = proxy.indexOf('?');
        var query = queryAt === -1 ? '' : proxy.substring(queryAt);
        proxy = (queryAt === -1 ? proxy : proxy.substring(0, queryAt)).replace(/\/+$/, '');
        return proxy + '/playlist.m3u8' + query + (query ? '&' : '?') + 'url=' + encodeURIComponent(url);
    }

    function mediaPlaylistUrl(url) {
        var match = url.match(/^(https:\/\/pl\.vlogphim\.net\/m3u8\/[^?#]+)([?#].*)?$/i);
        if (!match) return url;
        return match[1] + (/\.m3u8$/i.test(match[1]) ? '' : '.m3u8') + (match[2] || '');
    }

    // Resolve only a master playlist; never mistake its first media segment for a variant.
    function resolveVariant(masterUrl) {
        try {
            var res = fetch(masterUrl, { method: 'GET', headers: headers, timeout: 15000 });
            if (!res || !res.ok || !res.text) return '';
            var text = res.text() || '';
            if (text.indexOf('#EXTM3U') === -1) return '';
            if (text.indexOf('#EXT-X-MEDIA:') !== -1) return masterUrl;
            if (text.indexOf('#EXT-X-STREAM-INF:') === -1) return mediaPlaylistUrl(masterUrl);
            var base = res.url ? String(res.url) : masterUrl;
            var lines = text.split('\n');
            var variant = false;
            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] + '').replace(/^\s+|\s+$/g, '');
                if (line.indexOf('#EXT-X-STREAM-INF:') === 0) variant = true;
                else if (variant && line && line.charAt(0) !== '#') return mediaPlaylistUrl(absolute(line, base));
            }
        } catch (e) { }
        return '';
    }

    if (isVlogPhim(streamUrl)) {
        var direct = resolveVariant(streamUrl) || streamUrl;
        var proxied = proxyTarget(direct);
        // ponytail: native decoding depends on the player; configure a proxy only if PNG-wrapped segments fail.
        return native(proxied || direct);
    }

    if (/\.mp4(?:[?#]|$)/i.test(streamUrl) || /\.m3u8(?:[?#]|$)/i.test(streamUrl)) return native(streamUrl);

    if (kind !== 'page') {
        var variant = resolveVariant(streamUrl);
        if (variant) return native(variant);
        if (kind === 'hls' || kind === 'jwplayer') return native(streamUrl);
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
