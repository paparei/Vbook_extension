load('config.js');
function execute(url) {
    url = normalizeUrl(url);
    if (!url || url.indexOf(BASE_URL + "/series/") !== 0) return Response.error("Invalid series URL");
    var id = url.substring((BASE_URL + "/series/").length, (BASE_URL + "/series/").length + 26);
    var response = fetch(BASE_URL + "/series/" + id + "/full-chapter-list");
    if (!response.ok) return Response.error("HTTP " + response.status);
    var links = response.html().select('a[href^="/chapters/"]');
    var chapters = [];
    for (var i = links.size() - 1; i >= 0; i--) {
        var el = links.get(i);
        var name = el.select("span.grow > span");
        var link = normalizeUrl(el.attr("href"));
        if (!link || name.isEmpty()) return Response.error("Invalid chapter entry");
        chapters.push({ name: name.first().text(), url: link, lock: false, pay: false });
    }
    if (!chapters.length) return Response.error("No chapters found");
    return Response.success(chapters);
}
