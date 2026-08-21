load('config.js');

function execute() {
    return Response.success([
        { title: 'Mới cập nhật', input: COMIC_ROOT, script: 'gen.js' },
        { title: 'Manga', input: COMIC_ROOT + 'manga/', script: 'gen.js' },
        { title: 'Manhua', input: COMIC_ROOT + 'manhua/', script: 'gen.js' },
        { title: 'Manhwa', input: COMIC_ROOT + 'manhwa/', script: 'gen.js' },
        { title: 'Truyện màu', input: COMIC_ROOT + 'truyen-mau/', script: 'gen.js' },
        { title: 'Webtoon', input: COMIC_ROOT + 'webtoon/', script: 'gen.js' }
    ]);
}
