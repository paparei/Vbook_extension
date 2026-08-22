load('config.js');

function execute() {
    var categories = [
        ['Hành Động', '/genre/hanh-dong'],
        ['Tình Cảm', '/genre/tinh-cam'],
        ['Hài Hước', '/genre/hai-huoc'],
        ['Hoạt Hình', '/genre/hoat-hinh'],
        ['Viễn Tưởng', '/genre/vien-tuong'],
        ['Cổ Trang', '/genre/co-trang'],
        ['Phiêu Lưu', '/genre/phieu-luu'],
        ['Kinh Dị', '/genre/kinh-di'],
        ['Hình Sự', '/genre/hinh-su'],
        ['Chính Kịch', '/genre/chinh-kich'],
        ['Hàn Quốc', '/country/han-quoc'],
        ['Trung Quốc', '/country/trung-quoc'],
        ['Nhật Bản', '/country/nhat-ban'],
        ['Âu Mỹ', '/country/au-my'],
        ['Thái Lan', '/country/thai-lan'],
        ['Phim 2026', '/vod/phim-nam-2026'],
        ['Phim 2025', '/vod/phim-nam-2025'],
        ['Phim 2024', '/vod/phim-nam-2024']
    ];
    return Response.success(categories.map(function (item) {
        return { title: item[0], input: BASE_URL + item[1], script: 'gen.js' };
    }));
}
