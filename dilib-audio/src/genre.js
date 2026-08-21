load('config.js');

function execute() {
    var genres = [
        ['Sách Nói', AUDIO_ROOT],
        ['Radio', RADIO_ROOT],
        ['Góc Suy Ngẫm', RADIO_ROOT + 'goc-suy-ngam/'],
        ['Radio Tình Yêu', RADIO_ROOT + 'radio-tinh-yeu/'],
        ['Radio Cho Tâm Hồn', RADIO_ROOT + 'radio-cho-tam-hon/'],
        ['Radio Truyện Ngắn', RADIO_ROOT + 'radio-truyen-ngan/'],
        ['Radio Truyện Dài Kỳ', RADIO_ROOT + 'radio-truyen-dai-ky/'],
        ['Tản Mạn Radio', RADIO_ROOT + 'tan-man-radio/'],
        ['Kịch Truyền Thanh', RADIO_ROOT + 'kich-truyen-thanh/'],
        ['Tóm Tắt Sách', RADIO_ROOT + 'tom-tat-sach/']
    ];
    return Response.success(genres.map(function (genre) {
        return { title: genre[0], input: genre[1], script: 'gen.js' };
    }));
}
