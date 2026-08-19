load('config.js');

function execute() {
    return Response.success([
        { title: "🔥 ANIME MỚI CẬP NHẬT", input: BASE_URL + "/", script: "gen.js" },
        { title: "📺 ANIME ĐANG CHIẾU", input: BASE_URL + "/anime-dang-chieu/", script: "gen.js" },
        { title: "🎬 ANIME LẺ", input: BASE_URL + "/anime-le/", script: "gen.js" },
        { title: "📦 ANIME TRỌN BỘ", input: BASE_URL + "/anime-tron-bo/", script: "gen.js" }
    ]);
}
