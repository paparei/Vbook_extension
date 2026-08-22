load('config.js');

function execute() {
    return Response.success([
        { title: '🔥 Mới cập nhật', input: BASE_URL + '/vod/phim-moi', script: 'gen.js' },
        { title: '🎬 Phim lẻ', input: BASE_URL + '/vod/phim-le', script: 'gen.js' },
        { title: '📺 Phim bộ', input: BASE_URL + '/vod/phim-bo', script: 'gen.js' },
        { title: '🍿 Phim chiếu rạp', input: BASE_URL + '/vod/phim-chieu-rap', script: 'gen.js' },
        { title: '🎨 Phim hoạt hình', input: BASE_URL + '/genre/hoat-hinh', script: 'gen.js' }
    ]);
}
