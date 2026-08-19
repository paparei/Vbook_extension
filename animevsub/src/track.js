load('config.js');

function execute(input) {
    var data = {};
    try {
        data = JSON.parse(input);
    } catch (e) {
        data = { url: input };
    }

    var streamUrl = data.url || '';
    if (!streamUrl) return Response.error('Không có luồng phát');
    var referer = data.referer || DEFAULT_REFERER;

    var subtitles = [];
    var legacySub = '';
    var rawSubs = data.subs || [];
    for (var i = 0; i < rawSubs.length; i++) {
        var sub = rawSubs[i];
        if (!sub || !sub.file) continue;
        var lang = (sub.file + '').match(/\.([a-z]{2}(?:-[a-z0-9]+)?)\.vtt/i);
        subtitles.push({
            data: sub.file,
            type: 'vtt',
            label: sub.label || ('Sub ' + (i + 1)),
            language: lang ? lang[1] : ''
        });
        if (!legacySub) legacySub = sub.file;
    }

    return Response.success({
        data: streamUrl,
        type: 'native',
        mimeType: 'application/x-mpegURL',
        headers: {
            'Referer': referer,
            'User-Agent': BASE_UA
        },
        subtitles: subtitles,
        subtitle: legacySub,
        subtitleType: 'vtt'
    });
}
