load('config.js');

function execute(url) {
    var mangaId = uuidFromUrl(url, 'title');
    if (!mangaId) return Response.error('URL MangaDex không hợp lệ');

    var data = apiRequest('/manga/' + mangaId, [
        ['includes[]', 'author'],
        ['includes[]', 'artist'],
        ['includes[]', 'cover_art']
    ]);
    if (!data || !data.data || !data.data.attributes) return apiError('Không tải được thông tin manga');

    var manga = data.data;
    var attributes = manga.attributes;
    var genres = [];
    var tags = attributes.tags || [];
    for (var i = 0; i < tags.length; i++) {
        var name = tagName(tags[i]);
        if (!name || !tags[i].id) continue;
        genres.push({ title: name, input: tags[i].id, script: 'gen.js' });
    }

    var author = relationshipName(manga, 'author');
    var artist = relationshipName(manga, 'artist');
    if (artist && artist !== author) author += (author ? ' • ' : '') + artist;

    return Response.success({
        name: normalizeTitle(attributes.title),
        cover: coverUrl(mangaId, manga, '512'),
        author: author,
        description: cleanText(normalizeTitle(attributes.description)),
        detail: attributes.year ? String(attributes.year) : '',
        url: BASE_URL + '/title/' + mangaId,
        genres: genres,
        ongoing: attributes.status === 'ongoing',
        nsfw: attributes.contentRating !== 'safe'
    });
}
