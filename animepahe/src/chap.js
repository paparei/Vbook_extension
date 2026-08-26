load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    let servers = [];

    response.html().select(".gov-the-embed").forEach(function (el) {
        let match = el.attr("onclick").match(/putMi\s*\(\s*this\s*,\s*['\"]([^'\"]+)['\"]\s*\)/);
        if (!match) return;
        let server = {
            title: el.text().trim() || "Server",
            data: JSON.stringify({ payload: match[1], referer: url })
        };
        if (/megaplay/i.test(server.title)) servers.unshift(server);
        else servers.push(server);
    });

    return servers.length
        ? Response.success(servers)
        : Response.error("No playback servers found");
}
