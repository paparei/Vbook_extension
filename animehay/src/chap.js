load('config.js');

// Servers for one episode, from the RSC "episodes" array entries matching the
// episode slug: {"server":"#Hà Nội (Vietsub)","name":"Tập 01","slug":"tap-01","type":"m3u8","link":"https://..."}
function execute(url) {
    if (!url) return Response.success([]);
    url = normalizeUrl(url);

    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP ' + response.status);

    var html = unescapeRsc(response.text());

    var epSlugMatch = url.match(/\/(tap-[^\/\?]+)/);
    var epSlug = epSlugMatch ? epSlugMatch[1] : '';

    var servers = [];
    var seen = {};
    var pattern = /"server"\s*:\s*"([^"]+)"\s*,\s*"name"\s*:\s*"([^"]+)"\s*,\s*"slug"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"([^"]+)"\s*,\s*"link"\s*:\s*"([^"]+)"/g;
    var match;

    while ((match = pattern.exec(html)) !== null) {
        var slug = match[3];
        if (slug !== epSlug) continue;

        var type = match[4];
        if (type !== 'm3u8' && type !== 'embed') continue;

        var key = match[1] + '_' + type;
        if (seen[key]) continue;
        seen[key] = true;

        servers.push({
            title: match[1] + (type === 'm3u8' ? ' (M3U8)' : ' (Embed)'),
            data: JSON.stringify({
                url: match[5].replace(/\\\//g, '/'),
                type: type === 'm3u8' ? 'native' : 'auto',
                referer: DEFAULT_REFERER
            })
        });
    }

    return Response.success(servers);
}
