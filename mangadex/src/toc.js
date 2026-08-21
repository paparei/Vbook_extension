load('config.js');

function chapterLabel(attributes, item) {
    var label = attributes.chapter ? 'Ch. ' + attributes.chapter : 'Oneshot';
    if (attributes.volume) label = 'Vol. ' + attributes.volume + ' ' + label;
    if (attributes.title) label += ' - ' + cleanText(attributes.title);
    var group = relationshipName(item, 'scanlation_group');
    return label + (group ? ' [' + group + ']' : '');
}

function execute(url) {
    var mangaId = uuidFromUrl(url, 'title');
    if (!mangaId) return Response.error('URL MangaDex không hợp lệ');

    var languages = languageList();
    var groups = {};
    for (var l = 0; l < languages.length; l++) groups[languages[l]] = [];

    var offset = 0;
    var total = 1;
    while (offset < total) {
        var pairs = [
            ['limit', CHAPTER_PAGE_SIZE],
            ['offset', offset],
            ['includes[]', 'scanlation_group'],
            ['order[volume]', 'asc'],
            ['order[chapter]', 'asc']
        ];
        var langPairs = languageQuery();
        for (var p = 0; p < langPairs.length; p++) pairs.push(langPairs[p]);
        for (var r = 0; r < CONTENT_RATINGS.length; r++) pairs.push(['contentRating[]', CONTENT_RATINGS[r]]);

        var data = apiRequest('/manga/' + mangaId + '/feed', pairs);
        if (!data || !data.data) return apiError('Không tải được danh sách chương');
        total = Number(data.total) || 0;

        for (var i = 0; i < data.data.length; i++) {
            var item = data.data[i];
            var attributes = item.attributes || {};
            var language = attributes.translatedLanguage;
            if (!groups[language] || attributes.externalUrl) continue;
            groups[language].push({
                name: chapterLabel(attributes, item),
                url: BASE_URL + '/chapter/' + item.id,
                host: BASE_URL
            });
        }

        if (!data.data.length) break;
        offset += data.data.length;
    }

    for (var j = 0; j < languages.length; j++) {
        if (groups[languages[j]].length) return Response.success(groups[languages[j]]);
    }
    return Response.error('Không có chương phù hợp với ngôn ngữ đã cấu hình');
}
