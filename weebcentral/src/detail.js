load('config.js');
function execute(url) {
    url = normalizeUrl(url);
    if (!url || url.indexOf(BASE_URL + "/series/") !== 0) return Response.error("Invalid series URL");
    var response = fetch(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    var doc = response.html();
    var title = doc.select("main h1");
    var cover = imageUrl(doc.select('meta[property=og:image]').attr("content"));
    if (title.isEmpty() || !cover) return Response.error("Series details not found");
    return Response.success({
        name: title.first().text(),
        author: doc.select('main a[href*="?author="]').text(),
        cover: cover,
        description: doc.select("main li:has(> strong:containsOwn(Description)) > p").text(),
        detail: doc.select("main li:has(> strong:containsOwn(Tags)), main li:has(> strong:containsOwn(Type)), main li:has(> strong:containsOwn(Status)), main li:has(> strong:containsOwn(Released))").text(),
        url: url,
        type: "comic",
        format: "comic",
        locale: "en",
        ongoing: doc.select('main a[href*="included_status="]').text() !== "Complete",
        nsfw: doc.select("main li:has(> strong:containsOwn(Adult Content))").text().indexOf("Yes") !== -1
    });
}
