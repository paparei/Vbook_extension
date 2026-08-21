load('config.js');

function execute(key, page) {
    key = String(key || '').replace(/^\s+|\s+$/g, '');
    if (!key) return Response.success([]);
    var data = apiRequest('/manga', mangaQuery([
        ['title', key],
        ['order[relevance]', 'desc']
    ], offsetOf(page)));
    if (!data) return apiError('Không tìm thấy manga');
    return Response.success(mangaList(data), nextOffset(data));
}
