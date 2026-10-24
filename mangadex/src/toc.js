load('config.js');

function chapterLabel(attributes, item, language, showLang) {
    var label = attributes.chapter ? 'Ch. ' + attributes.chapter : 'Oneshot';
    if (attributes.volume) label = 'Vol. ' + attributes.volume + ' ' + label;
    if (showLang) label = '[' + language.toUpperCase() + '] ' + label;
    if (attributes.title) label += ' - ' + cleanText(attributes.title);
    var group = relationshipName(item, 'scanlation_group');
    return label + (group ? ' [' + group + ']' : '');
}

function execute(url) {
    var mangaId = uuidFromUrl(url, 'title');
    if (!mangaId) return Response.error('URL MangaDex không hợp lệ');

    var languages = languageList();
    var showLang = languages.length > 1;
    var rank = {};
    for (var l = 0; l < languages.length; l++) rank[languages[l]] = l;
    // One entry per chapter number: the highest-priority language wins; same-language groups all stay.
    var best = {};
    var seen = 0;

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
            if (rank[language] === undefined || attributes.externalUrl) continue;
            var key = attributes.chapter ? 'c' + attributes.chapter : 'id' + item.id;
            var slot = best[key];
            if (!slot || rank[language] < slot.rank) {
                var num = parseFloat(attributes.chapter);
                slot = best[key] = { rank: rank[language], num: isNaN(num) ? Infinity : num, index: slot ? slot.index : seen++, items: [] };
            } else if (rank[language] > slot.rank) continue;
            slot.items.push({
                name: chapterLabel(attributes, item, language, showLang),
                url: BASE_URL + '/chapter/' + item.id,
                host: BASE_URL
            });
        }

        if (!data.data.length) break;
        offset += data.data.length;
    }

    var slots = [];
    for (var k in best) slots.push(best[k]);
    slots.sort(function (a, b) { return (a.num - b.num) || (a.index - b.index); });
    var merged = [];
    for (var s = 0; s < slots.length; s++) merged = merged.concat(slots[s].items);
    return merged.length ? Response.success(merged) : Response.error('Không có chương phù hợp với ngôn ngữ đã cấu hình');
}
