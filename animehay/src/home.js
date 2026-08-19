load('config.js');

function execute() {
    return Response.success([
        { title: "🔥 ANIME MỚI CẬP NHẬT", input: BASE_URL + "/danh-sach", script: "gen.js" },
        { title: "📺 ANIME ĐANG CHIẾU", input: BASE_URL + "/dang-chieu", script: "gen.js" },
        { title: "🎬 ANIME LẺ", input: BASE_URL + "/danh-sach/phim-le", script: "gen.js" },
        { title: "📦 ANIME BỘ", input: BASE_URL + "/danh-sach/phim-bo", script: "gen.js" },
        { title: "🏆 TOP 10 HH3D", input: BASE_URL + "/top-10", script: "gen.js" }
    ]);
}
