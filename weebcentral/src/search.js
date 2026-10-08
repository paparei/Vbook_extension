load('config.js');
function execute(query, page) {
    query = String(query || "").trim();
    page = String(page || "1");
    if (!query || query.length > 500 || !/^[1-9][0-9]{0,5}$/.test(page)) return Response.error("Invalid search or page");
    if (!/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(BASE_URL)) return Response.error("Invalid domain");
    var latest = query === "/latest-updates";
    // ponytail: quick search is a single result set; use advanced search if full pagination is needed.
    if (!latest && page !== "1") return Response.success([], "");
    var response = latest ? fetch(BASE_URL + "/latest-updates/" + page) : fetch(BASE_URL + "/search/simple?location=main", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "text=" + encodeURIComponent(query)
    });
    if (!response.ok) return Response.error("HTTP " + response.status);
    var doc = response.html();
    if (!latest && doc.select("#quick-search-result").isEmpty()) return Response.error("Search results not found");
    var nodes = doc.select(latest ? "article[data-tip]" : '#quick-search-result a[href*="/series/"]');
    var items = [];
    var seen = {};
    for (var i = 0; i < nodes.size(); i++) {
        var el = nodes.get(i);
        var link = normalizeUrl(latest ? el.select('a[href^="/series/"]').attr("href") : el.attr("href"));
        var name = latest ? String(el.attr("data-tip")).trim() : String(el.text()).trim();
        var cover = imageUrl(el.select("picture img").attr("src"));
        if (!link || !name || !cover) return Response.error("Invalid series entry");
        if (seen[link]) continue;
        seen[link] = true;
        items.push({ name: name, link: link, cover: cover });
    }
    var next = "";
    if (latest) {
        if (!items.length) return Response.error("Latest updates not found");
        var more = String(doc.select('button[hx-get*="/latest-updates/"]').attr("hx-get")).match(/\/latest-updates\/([1-9][0-9]*)$/);
        if (more && Number(more[1]) > Number(page)) next = more[1];
    }
    return Response.success(items, next);
}
