load('config.js');

function execute() {
    var genres = [
        ['Manga', 'manga'], ['Manhua', 'manhua'], ['Manhwa', 'manhwa'],
        ['Action', 'action'], ['Adventure', 'adventure'], ['Comedy', 'comedy'],
        ['Fantasy', 'fantasy'], ['Romance', 'romance'], ['Drama', 'drama'],
        ['Mystery', 'mystery'], ['Historical', 'historical'], ['Horror', 'horror'],
        ['School Life', 'school-life'], ['Slice Of Life', 'slice-of-life'],
        ['Truyện Màu', 'truyen-mau'], ['Webtoon', 'webtoon'],
        ['Xuyên Không', 'xuyen-khong'], ['Tu Tiên', 'tu-tien']
    ];
    var result = [];
    genres.forEach(function (genre) {
        result.push({ title: genre[0], input: COMIC_ROOT + genre[1] + '/', script: 'gen.js' });
    });
    return Response.success(result);
}
