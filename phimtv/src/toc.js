load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP ' + response.status);
    var doc = response.html();
    if (!doc) return Response.success([]);

    var firstPlay = doc.select('a[href*="/play/"]').first();
    if (doc.select('.server-group').size() === 0 && firstPlay) {
        response = fetchPage(normalizeUrl(firstPlay.attr('href')));
        if (!response.ok) return Response.error('HTTP ' + response.status);
        doc = response.html();
        if (!doc) return Response.success([]);
    }

    var result = [];
    var seen = {};
    doc.select('.server-group').forEach(function (group) {
        var heading = group.select('div').first();
        var serverName = heading ? cleanText(heading.text()).replace(/^Danh sách tập\s*#?\d*\s*/i, '') : '';
        group.select('ul.episodes a[href*="/play/"]').forEach(function (episode) {
            var link = normalizeUrl(episode.attr('href'));
            if (!link || seen[link]) return;
            seen[link] = true;
            var name = cleanText(episode.text());
            result.push({ name: serverName ? serverName + ' - ' + name : name, url: link, host: BASE_URL });
        });
    });
    if (result.length) return Response.success(result);

    doc.select('a[href*="/play/"]').forEach(function (episode) {
        var link = normalizeUrl(episode.attr('href'));
        if (!link || seen[link]) return;
        seen[link] = true;
        result.push({ name: cleanText(episode.text()) || 'Xem phim', url: link, host: BASE_URL });
    });
    return Response.success(result);
}
