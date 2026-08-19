load('config.js');

function execute() {
    var result = [];
    var j = fetchJson(API_URL + '/genres', false);
    var genres = (j && j.data) ? j.data : j;
    if (genres && genres.length) {
        for (var i = 0; i < genres.length; i++) {
            var g = genres[i];
            if (!g.slug) continue;
            result.push({
                title: (g.name || g.slug) + '',
                input: 'the-loai/' + g.slug,
                script: 'gen.js'
            });
        }
    }
    if (result.length) return Response.success(result);

    // Fallback if /genres is unreachable
    var fallback = ['action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror', 'mystery', 'romance', 'sci-fi', 'slice-of-life', 'sports', 'supernatural', 'suspense'];
    for (var k = 0; k < fallback.length; k++) {
        result.push({
            title: fallback[k].charAt(0).toUpperCase() + fallback[k].slice(1),
            input: 'the-loai/' + fallback[k],
            script: 'gen.js'
        });
    }
    return Response.success(result);
}
