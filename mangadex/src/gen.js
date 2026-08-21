load('config.js');

function execute(input, page) {
    var offset = offsetOf(page);
    var order = input === 'follows' ? 'followedCount' : input === 'rating' ? 'rating' : 'latestUploadedChapter';
    var extra = [['order[' + order + ']', 'desc']];
    if (input === 'latest' || input === 'follows') extra.push(['status[]', 'ongoing']);
    if (input === 'completed') extra.push(['status[]', 'completed']);
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(input || ''))) {
        extra.push(['includedTags[]', input]);
        extra.push(['includedTagsMode', 'AND']);
    }
    var data = apiRequest('/manga', mangaQuery(extra, offset));
    if (!data) return apiError('Không tải được danh sách manga');
    return Response.success(mangaList(data), nextOffset(data));
}
