load('config.js');
load('crypto.js');

function serverProvider(payload) {
    try {
        let html = CryptoJS.enc.Base64.parse(payload).toString(CryptoJS.enc.Utf8);
        let iframe = html.match(/<iframe[^>]+src=['\"]([^'\"]+)['\"]/i);
        let url = iframe ? iframe[1] : "";
        if (/megaplay/i.test(url)) return "MegaPlay";
        if (/flixcloud/i.test(url)) return "FlixCloud";
        if (/blogger/i.test(url)) return "Blogger";
    } catch (error) {
    }
    return "";
}

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    let servers = [];
    let nativeServers = [];

    response.html().select(".gov-the-embed").forEach(function (el) {
        let match = el.attr("onclick").match(/putMi\s*\(\s*this\s*,\s*['\"]([^'\"]+)['\"]\s*\)/);
        if (!match) return;
        let provider = serverProvider(match[1]);
        let title = el.text().trim() || "Server";
        let server = {
            title: title + (provider ? " (" + provider + ")" : ""),
            data: JSON.stringify({ payload: match[1], referer: url })
        };
        servers.push(server);
        if (provider === "MegaPlay") nativeServers.push(server);
    });
    if (nativeServers.length) servers = nativeServers;

    return servers.length
        ? Response.success(servers)
        : Response.error("No playback servers found");
}
