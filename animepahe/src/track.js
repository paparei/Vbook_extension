load('config.js');
load('crypto.js');

function playback(url, type, referer, subtitles) {
    subtitles = subtitles || [];
    let result = {
        type: type,
        data: url,
        host: BASE_URL,
        headers: { "User-Agent": UserAgent.chrome(), "Referer": referer },
        timeSkip: [],
        subtitles: subtitles
    };
    if (type === "native") {
        result.mimeType = url.indexOf(".mp4") !== -1 ? "video/mp4" : "application/x-mpegURL";
    }
    if (subtitles.length) {
        result.subtitle = subtitles[0].data;
        result.subtitleType = subtitles[0].type;
    }
    return Response.success(result);
}

function directStream(text) {
    let match = text.match(/https?:[\\\/]+[^\x22\x27\s<]+?\.m3u8[^\x22\x27\s<]*/i);
    if (!match) match = text.match(/https?:[\\\/]+[^\x22\x27\s<]+?\.mp4[^\x22\x27\s<]*/i);
    return match ? match[0].replace(/\\\//g, "/").split("&" + "amp;").join("&") : "";
}

function resolveMegaPlay(embed, referer) {
    let page = fetchPage(embed, referer);
    if (!page.ok) return Response.error("MegaPlay unavailable (HTTP " + page.status + ")");
    let id = page.text().match(/id=['\"]megaplay-player['\"][^>]+data-id=['\"](\d+)['\"]/i);
    if (!id) return Response.error("MegaPlay source ID not found");

    let origin = embed.match(/^https?:\/\/[^\/]+/i);
    if (!origin) return Response.error("Invalid MegaPlay URL");
    origin = origin[0] + "/";
    let response = fetch(origin + "stream/getSourcesNew?id=" + id[1], {
        headers: {
            "User-Agent": UserAgent.chrome(),
            "Referer": origin,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest"
        }
    });
    if (!response.ok) return Response.error("MegaPlay source unavailable (HTTP " + response.status + ")");

    let data;
    try {
        data = JSON.parse(response.text());
    } catch (error) {
        return Response.error("Invalid MegaPlay response");
    }
    let stream = data.sources && data.sources.file;
    if (!stream && data.sources && data.sources.length) stream = data.sources[0].file;
    if (!/^https?:\/\//i.test(stream || "")) return Response.error("MegaPlay stream not found");

    let subtitles = [];
    let tracks = data.tracks || [];
    for (let i = 0; i < tracks.length; i++) {
        if (!tracks[i] || !tracks[i].file || !/captions|subtitles/i.test(tracks[i].kind || "")) continue;
        subtitles.push({
            data: tracks[i].file,
            type: "vtt",
            label: tracks[i].label || "Subtitle",
            language: ""
        });
    }
    return playback(stream, "native", origin, subtitles);
}

function execute(data) {
    let input;
    try {
        input = JSON.parse(data);
    } catch (error) {
        return Response.error("Invalid playback data");
    }
    if (!input.referer || (!input.payload && !input.embed)) return Response.error("Missing playback data");

    let embed = input.embed;
    if (!embed) {
        let html;
        try {
            html = CryptoJS.enc.Base64.parse(input.payload).toString(CryptoJS.enc.Utf8);
        } catch (error) {
            return Response.error("Invalid server payload");
        }
        let iframe = html.match(/<iframe[^>]+src=['\"]([^'\"]+)['\"]/i);
        if (!iframe) return Response.error("Server embed not found");
        embed = iframe[1].split("&" + "amp;").join("&");
    }
    if (embed.indexOf("//") === 0) embed = "https:" + embed;

    if (/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(embed)) return playback(embed, "native", input.referer);
    if (/\/\/[^\/]*megaplay\./i.test(embed)) return resolveMegaPlay(embed, input.referer);

    let response = fetchPage(embed, input.referer);
    if (!response.ok) return Response.error("Playback server unavailable (HTTP " + response.status + ")");
    let stream = directStream(response.text());
    if (stream) return playback(stream, "native", embed);

    // ponytail: Blogger needs a Google session and FlixCloud derives its AES key from
    // per-page WASM, so both are left to the webview; MegaPlay above covers them natively.
    return playback(embed, "webview", input.referer);
}
