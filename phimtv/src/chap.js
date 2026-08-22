load('config.js');

function execute(url) {
    if (!url) return Response.success([]);
    var response = fetchPage(normalizeUrl(url));
    if (!response.ok) return Response.error('HTTP ' + response.status);
    var doc = response.html();
    if (!doc) return Response.success([]);

    var result = [];
    var seen = {};
    doc.select('.streaming-server').forEach(function (server) {
        var link = server.attr('data-link') || '';
        if (!link || seen[link]) return;
        link = link.replace(/^http:/i, 'https:');
        var type = (server.attr('data-type') || '').toLowerCase();
        seen[link] = true;
        result.push({
            title: cleanText(server.text()) || (type === 'm3u8' ? 'HLS' : 'Embed'),
            data: JSON.stringify({ url: link, type: type === 'm3u8' ? 'native' : 'auto', referer: DEFAULT_REFERER })
        });
    });
    return Response.success(result);
}
