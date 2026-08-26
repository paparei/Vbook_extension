load('config.js');

function execute() {
    let response = fetchPage(BASE_URL + "/wp-sitemap-taxonomies-genres-1.xml");
    if (!response.ok) return Response.error("HTTP " + response.status);

    let genres = [];
    response.html().select("loc").forEach(function (el) {
        let url = el.text();
        let match = url.match(/\/genres\/([^/]+)\/?$/i);
        if (!match) return;
        let title = match[1].split("-").map(function (word) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
        genres.push({ title: title, input: normalizeUrl(url), script: "search.js" });
    });

    return Response.success(genres);
}
