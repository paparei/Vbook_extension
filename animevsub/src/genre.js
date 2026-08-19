load('config.js');

// genre.js - Trả về danh sách thể loại anime từ animevsub.app
function execute() {
    var genres = [
        ["Hành Động", "action"], ["Phiêu Lưu", "adventure"], ["Hài Hước", "comedy"],
        ["Kịch Tính", "drama"], ["Huyền Ảo", "fantasy"], ["Harem", "harem"],
        ["Lịch Sử", "historical"], ["Kinh Dị", "horror"], ["Magic", "magic"],
        ["Mecha", "mecha"], ["Quân Đội", "military"], ["Âm Nhạc", "music"],
        ["Bí Ẩn", "mystery"], ["Lãng Mạn", "romance"], ["Học Đường", "school"],
        ["Đời Thường", "slice-of-life"], ["Thể Thao", "sport"], ["Siêu Nhiên", "supernatural"]
    ];

    return Response.success(genres.map(function (g) {
        return {
            title: g[0],
            input: BASE_URL + "/" + g[1] + "/",
            script: "gen.js"
        };
    }));
}
