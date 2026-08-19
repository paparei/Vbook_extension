load('config.js');

// genre.js - Danh sách thể loại + quốc gia + năm phát hành từ animehay.fm
function execute() {
    var genres = [
        ["Hành Động", "/the-loai/hanh-dong"],
        ["Tình Cảm", "/the-loai/tinh-cam"],
        ["Hài Hước", "/the-loai/hai-huoc"],
        ["Cổ Trang", "/the-loai/co-trang"],
        ["Chiến Tranh", "/the-loai/chien-tranh"],
        ["Thể Thao", "/the-loai/the-thao"],
        ["Võ Thuật", "/the-loai/vo-thuat"],
        ["Viễn Tưởng", "/the-loai/vien-tuong"],
        ["Phiêu Lưu", "/the-loai/phieu-luu"],
        ["Khoa Học", "/the-loai/khoa-hoc"],
        ["Kinh Dị", "/the-loai/kinh-di"],
        ["Thần Thoại", "/the-loai/than-thoai"],
        ["Gia Đình", "/the-loai/gia-dinh"],
        ["Bí Ẩn", "/the-loai/bi-an"],
        ["Học Đường", "/the-loai/hoc-duong"],
        ["── Quốc Gia ──", ""],
        ["Nhật Bản", "/quoc-gia/nhat-ban"],
        ["Trung Quốc", "/quoc-gia/trung-quoc"],
        ["Hàn Quốc", "/quoc-gia/han-quoc"],
        ["Âu Mỹ", "/quoc-gia/au-my"],
        ["Thái Lan", "/quoc-gia/thai-lan"],
        ["── Năm Phát Hành ──", ""],
        ["Năm 2026", "/nam-phat-hanh/2026"],
        ["Năm 2025", "/nam-phat-hanh/2025"],
        ["Năm 2024", "/nam-phat-hanh/2024"],
        ["Năm 2023", "/nam-phat-hanh/2023"]
    ];

    var result = [];
    genres.forEach(function (g) {
        if (g[1]) {
            result.push({
                title: g[0],
                input: BASE_URL + g[1],
                script: "gen.js"
            });
        }
    });

    return Response.success(result);
}
