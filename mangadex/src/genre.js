load('config.js');

function execute() {
    var data = apiRequest('/manga/tag', []);
    if (!data || !data.data) return apiError('Không tải được thể loại');
    var genres = [];
    for (var i = 0; i < data.data.length; i++) {
        var tag = data.data[i];
        var name = tagName(tag);
        if (!name || !tag.id) continue;
        genres.push({ title: name, input: tag.id, script: 'gen.js' });
    }
    return Response.success(genres);
}
