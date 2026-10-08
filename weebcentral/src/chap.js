load('config.js');
function execute(url) {
    url = normalizeUrl(url);
    if (!url || !/^\/chapters\/[0-9A-Z]{26}$/.test(url.substring(BASE_URL.length))) return Response.error("Invalid chapter URL");
    var response = fetch(url + "/images?is_prev=False&reading_style=long_strip&current_page=1");
    if (!response.ok) return Response.error("HTTP " + response.status);
    var nodes = response.html().select("#chapter-images img");
    var images = [];
    for (var i = 0; i < nodes.size(); i++) {
        var link = imageUrl(nodes.get(i).attr("src"));
        if (!link) return Response.error("Invalid page image");
        images.push(link);
    }
    if (!images.length) return Response.error("No chapter images found");
    return Response.success(images);
}
