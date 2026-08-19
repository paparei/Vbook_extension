load('config.js');

function execute(data) {
    var streamUrl = '';
    var kind = '';
    try {
        var obj = JSON.parse(data);
        streamUrl = obj.url || '';
        kind = obj.type || '';
    } catch (e) {
        streamUrl = (data || '') + '';
    }
    if (!streamUrl) return Response.error('Không có luồng phát');

    var headers = {
        'User-Agent': UA,
        'Referer': BASE_URL + '/',
        'Origin': BASE_URL
    };

    var native = streamUrl.indexOf('.m3u8') !== -1 || streamUrl.indexOf('.mp4') !== -1 || kind === 'jwplayer' || kind === 'hls';

    // ponytail: stream URLs often have no extension (pl.vlogphim.net/file/<hash>);
    // sniff once for a HLS master playlist. Upgrade: cache per-URL verdict if probing gets slow.
    if (!native) {
        try {
            var res = fetch(streamUrl, { method: 'GET', headers: headers, timeout: 15000 });
            var text = res && res.text ? (res.text() || '') : '';
            if (text.indexOf('#EXTM3U') !== -1) native = true;
        } catch (e) { }
    }

    // native HLS/mp4 -> player; anything else -> WebView sniff
    return Response.success({
        data: streamUrl,
        type: native ? 'native' : 'auto',
        headers: headers,
        host: BASE_URL,
        timeSkip: []
    });
}
