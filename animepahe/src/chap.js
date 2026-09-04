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

// MegaPlay addresses episodes by MyAnimeList id, so a native server can be built
// from the episode slug even when AnimePahe lists only JS-only embeds.
function megaPlayServer(url) {
    let slug = url.match(/\/([a-z0-9-]+)-episode-(\d+)-english-(sub|dub)bed/i);
    if (!slug) return null;

    let response = fetch(
        "https://myanimelist.net/search/prefix.json?type=anime&keyword=" +
        encodeURIComponent(slug[1].replace(/-/g, " ")) + "&v=1",
        { headers: { "User-Agent": UserAgent.chrome() } }
    );
    if (!response.ok) return null;

    let items;
    try {
        items = JSON.parse(response.text()).categories[0].items;
    } catch (error) {
        return null;
    }
    if (!items || !items.length) return null;

    return {
        title: "HD (MegaPlay)",
        data: JSON.stringify({
            embed: "https://megaplay.buzz/stream/mal/" + items[0].id + "/" + slug[2] + "/" + slug[3].toLowerCase(),
            referer: url
        })
    };
}

function execute(url) {
    url = normalizeUrl(url);
    let response = fetchPage(url);
    if (!response.ok) return Response.error("HTTP " + response.status);
    let servers = [];
    let hasMegaPlay = false;

    response.html().select(".gov-the-embed").forEach(function (el) {
        let match = el.attr("onclick").match(/putMi\s*\(\s*this\s*,\s*['\"]([^'\"]+)['\"]\s*\)/);
        if (!match) return;
        let provider = serverProvider(match[1]);
        let title = el.text().trim() || "Server";
        let server = {
            title: title + (provider ? " (" + provider + ")" : ""),
            data: JSON.stringify({ payload: match[1], referer: url })
        };
        if (provider === "MegaPlay") {
            hasMegaPlay = true;
            servers.unshift(server);
        } else {
            servers.push(server);
        }
    });

    if (!hasMegaPlay) {
        let synthesized = megaPlayServer(url);
        if (synthesized) servers.unshift(synthesized);
    }

    return servers.length
        ? Response.success(servers)
        : Response.error("No playback servers found");
}
