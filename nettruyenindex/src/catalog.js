function ntCards(nodes, chapterSelector) {
    var items = [], seen = {};
    nodes.forEach(function (card) {
        var title = card.select('h3 a[href^="/manga/"]').first();
        if (!title) return;
        var name = String(title.text()).trim(), link = ntUrl(title.attr('href'));
        if (!name || seen[link]) return;
        seen[link] = true;
        var image = card.select('img');
        var cover = String(image.attr('data-original') || image.attr('data-src') || image.attr('src') || '');
        if (cover.indexOf('//') === 0) cover = 'https:' + cover;
        else if (cover.charAt(0) === '/') cover = ntUrl(cover);
        var chapter = card.select(chapterSelector).first();
        items.push({name: name, link: link, cover: cover, description: chapter ? String(chapter.text()) : ''});
    });
    return items;
}

function ntMenu(doc, selector) {
    var rows = [], seen = {};
    doc.select(selector).forEach(function (anchor) {
        var input = String(anchor.attr('href')), title = String(anchor.text()).trim();
        if (!title || seen[input]) return;
        seen[input] = true;
        rows.push({title: title, input: input, script: 'search.js'});
    });
    return rows;
}
