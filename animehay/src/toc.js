load('config.js');

// Episode list lives in the Next.js RSC payload: "episodes":[{"name":"Tập 01","slug":"tap-01","type":"m3u8",...}]
// with escaped quotes — unescape once, then regex (data is not in the DOM).
function execute(url) {
    url = normalizeUrl(url);
    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP ' + response.status);

    var html = unescapeRsc(response.text());
    if (!html) return Response.success([]);

    // movie slug from the detail url: /phim/{slug}
    var slugMatch = url.match(/\/phim\/([^\/\?]+)/);
    var movieSlug = slugMatch ? slugMatch[1] : '';

    var list = [];
    var seen = {};
    // only type "m3u8" entries — each episode also has a duplicate "embed" entry
    var pattern = /"name"\s*:\s*"([^"]+)"\s*,\s*"slug"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"m3u8"/g;
    var match;
    while ((match = pattern.exec(html)) !== null) {
        var epSlug = match[2];
        if (seen[epSlug]) continue;
        seen[epSlug] = true;
        list.push({
            name: match[1],
            url: BASE_URL + '/phim/' + movieSlug + '/' + epSlug,
            host: BASE_URL
        });
    }

    return Response.success(list);
}
