load('config.js');

function pagedUrl(url, page) {
    if (page === "1") return url;
    let queryAt = url.indexOf("?");
    let path = queryAt === -1 ? url : url.slice(0, queryAt);
    let query = queryAt === -1 ? "" : url.slice(queryAt);
    return path.replace(/\/+$/, "") + "/page/" + page + "/" + query;
}

function execute(query, page) {
    query = String(query || "");
    page = String(page || "1");

    let browse = query.indexOf("/") === 0 || /^https?:\/\//i.test(query);
    let base = browse ? normalizeUrl(query) : BASE_URL + "/?s=" + encodeURIComponent(query);
    let response = fetchPage(pagedUrl(base, page));
    if (!response.ok) return Response.error("HTTP " + response.status);
    let doc = response.html();
    let items = [];

    doc.select(".postbody .listupd article.bs").forEach(function (el) {
        let linkEl = el.select(".bsx > a.tip").first();
        if (!linkEl) linkEl = el.select("a").first();
        if (!linkEl) return;
        let image = el.select("img.ts-post-image").first();
        let cover = image ? image.attr("src") || image.attr("data-src") : "";
        let name = linkEl.attr("title") || el.select(".tt h2").text();
        let status = el.select(".epx").text();
        let language = el.select(".sb").text();
        if (!name) return;
        items.push({
            name: name,
            cover: cover,
            link: normalizeUrl(linkEl.attr("href")),
            description: status,
            tag: language || status
        });
    });

    let nextPage = doc.select(".pagination a.next.page-numbers").isEmpty()
        ? ""
        : String(parseInt(page, 10) + 1);
    return Response.success(items, nextPage);
}
