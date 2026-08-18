load('config.js');

function execute() {
    return Response.success([
        { title: "Mới Cập Nhật", input: "latest-episodes", script: "gen.js" },
        { title: "Đang Thịnh Hành", input: "trending", script: "gen.js" },
        { title: "Top Đang Chiếu", input: "top-airing", script: "gen.js" },
        { title: "Phổ Biến Nhất", input: "most-popular", script: "gen.js" },
        { title: "Mới Hoàn Thành", input: "latest-completed", script: "gen.js" },
        { title: "Anime Bộ", input: "danh-sach/anime-bo", script: "gen.js" },
        { title: "Anime Lẻ / Movie", input: "danh-sach/anime-le", script: "gen.js" }
    ]);
}
