load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    let doc = response.html();

    let studio = "";
    let status = "";
    doc.select(".infox .spe span").forEach(function (el) {
        let text = el.text().trim();
        if (/^Studio:/i.test(text)) studio = text.replace(/^Studio:\s*/i, "");
        if (/^Status:/i.test(text)) status = text.replace(/^Status:\s*/i, "");
    });

    let coverEl = doc.select(".thumb img.ts-post-image").first();
    let cover = coverEl ? coverEl.attr("src") || coverEl.attr("data-src") : "";
    if (!cover) cover = doc.select('meta[property="og:image"]').attr("content");

    return Response.success({
        name: doc.select(".infox h1.entry-title").text(),
        author: studio,
        cover: cover,
        description: doc.select(".bixbox.synp .entry-content").html(),
        detail: doc.select(".infox .spe").html(),
        url: url,
        type: "video",
        format: "series",
        ongoing: !/completed|finished/i.test(status),
        tags: doc.select(".infox .genxed a").map(function (el) {
            return { title: el.text(), input: normalizeUrl(el.attr("href")), script: "search.js" };
        })
    });
}
