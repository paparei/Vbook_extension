load('config.js');

function execute(url) {
    if (!url) return Response.success([]);
    url = normalizeUrl(url);

    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP ' + response.status);

    var html = response.text();
    var servers = [];

    // streams live in an inline JS array: var all_sources = ["https://...m3u8", ...]
    var block = html.match(/all_sources\s*=\s*\[([\s\S]*?)\]/);
    if (block) {
        var urls = block[1].match(/["'](https?:[^"']+)["']/g) || [];
        for (var i = 0; i < urls.length; i++) {
            var streamUrl = urls[i].slice(1, -1);

            // server title from its domain (kkphimplayer7.com -> Kkphimplayer7)
            var serverTitle = 'Server ' + (i + 1);
            var domainMatch = streamUrl.match(/https?:\/\/([^\/]+)/);
            if (domainMatch && domainMatch[1]) {
                var domain = domainMatch[1].replace('www.', '').split('.')[0];
                if (domain) serverTitle = domain.charAt(0).toUpperCase() + domain.slice(1);
            }

            servers.push({
                title: serverTitle,
                data: JSON.stringify({
                    url: streamUrl,
                    referer: url,
                    subs: parseSubtitles(html)
                })
            });
        }
    }

    return Response.success(servers);
}

// var all_subtitles = ["https://...vtt", ...] — entries may be empty strings
function parseSubtitles(html) {
    var subs = [];
    var block = html.match(/all_subtitles\s*=\s*\[([\s\S]*?)\]/);
    if (!block) return subs;
    var urls = block[1].match(/["'](https?:[^"']+)["']/g) || [];
    for (var i = 0; i < urls.length; i++) {
        subs.push({ file: urls[i].slice(1, -1), label: 'Sub ' + (i + 1) });
    }
    return subs;
}
