load('config.js');
load('crypto.js');

function playback(url, type, referer, subtitles) {
    subtitles = subtitles || [];
    let result = {
        type: type,
        data: url,
        host: BASE_URL,
        headers: { "User-Agent": UserAgent.chrome() },
        timeSkip: [],
        subtitles: subtitles
    };
    if (type !== "auto") result.headers.Referer = referer;
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
    let id = String(page.html().select("#megaplay-player").attr("data-id"));
    if (!/^\d+$/.test(id)) return Response.error("MegaPlay source ID not found");

    let origin = embed.match(/^https?:\/\/[^\/]+/i);
    if (!origin) return Response.error("Invalid MegaPlay URL");
    origin = origin[0] + "/";
    let response = fetch(origin + "stream/getSourcesNew?id=" + id, {
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
    if (!data || typeof data !== "object") return Response.error("Invalid MegaPlay response");

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
    if (data.enc) {
        let browser = Engine.newBrowser();
        try {
            browser.setUserAgent(UserAgent.chrome());
            // MegaPlay rejects direct navigation without the AnimePahe Referer.
            browser.launch(BASE_URL + "/", 15000);
            browser.callJs('location.href=' + JSON.stringify(embed) + '; ""', 1000);
            for (let attempt = 0; attempt < 20; attempt++) {
                browser.html(1000);
                let resolved = String(browser.callJs("(function(){try{return String(jwplayer().getPlaylist()[0].sources[0].file||'');}catch(e){return '';}})()", 1000).text());
                // Windows WebView returns a JSON-quoted string; other engines return plain text.
                if (resolved.charAt(0) === '"') {
                    try { resolved = JSON.parse(resolved); } catch (error) { resolved = ""; }
                }
                if (typeof resolved === "string" && /^https?:\/\//i.test(resolved)) {
                    return playback(resolved, "native", origin, subtitles);
                }
            }
            return Response.error("MegaPlay did not return a playable stream. Try another server.");
        } finally {
            browser.close();
        }
    }
    let source = Array.isArray(data.sources) ? data.sources[0] : data.sources;
    let stream = typeof source === "string" ? source : source && source.file;
    if (typeof stream !== "string" || !/^https?:\/\//i.test(stream)) return Response.error("MegaPlay stream not found");
    return playback(stream, "native", origin, subtitles);
}

function execute(data) {
    let input;
    try {
        input = JSON.parse(data);
    } catch (error) {
        return Response.error("Invalid playback data");
    }
    if (!input || typeof input.referer !== "string" || !/^https?:\/\//i.test(input.referer) ||
        (typeof input.payload !== "string" && typeof input.embed !== "string")) return Response.error("Missing playback data");

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
    if (typeof embed !== "string") return Response.error("Invalid server URL");
    if (embed.indexOf("//") === 0) embed = "https:" + embed;
    if (!/^https?:\/\//i.test(embed)) return Response.error("Invalid server URL");

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
