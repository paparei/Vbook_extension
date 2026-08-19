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

    // Direct HLS/mp4 stream -> native player
    if (streamUrl.indexOf('.m3u8') !== -1 || streamUrl.indexOf('.mp4') !== -1 || kind === 'jwplayer' || kind === 'hls') {
        return Response.success({
            data: streamUrl,
            type: 'native',
            headers: headers,
            host: BASE_URL,
            timeSkip: []
        });
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
