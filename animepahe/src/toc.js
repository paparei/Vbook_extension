load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    let episodes = [];

    response.html().select(".bixbox.epcheck .eplister li a").forEach(function (el) {
        let number = el.select(".epl-num").text().trim();
        let title = el.select(".epl-title").text().trim();
        episodes.push({
            name: number + (title && title !== number ? " - " + title : ""),
            url: normalizeUrl(el.attr("href")),
            description: el.select(".epl-date").text().trim(),
            lock: false,
            pay: false
        });
    });

    return Response.success(episodes);
}
