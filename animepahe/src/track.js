load('config.js');
load('crypto.js');

function playback(url, type, referer) {
    let result = {
        type: type,
        data: url,
        host: BASE_URL,
        headers: { "User-Agent": UserAgent.chrome(), "Referer": referer },
        timeSkip: [],
        subtitles: []
    };
    if (type === "native") {
        result.mimeType = url.indexOf(".mp4") !== -1 ? "video/mp4" : "application/x-mpegURL";
    }
    return Response.success(result);
}

function directStream(text) {
    let match = text.match(/https?:[\\\/]+[^\x22\x27\s<]+?\.m3u8[^\x22\x27\s<]*/i);
    if (!match) match = text.match(/https?:[\\\/]+[^\x22\x27\s<]+?\.mp4[^\x22\x27\s<]*/i);
    return match ? match[0].replace(/\\\//g, "/").split("&" + "amp;").join("&") : "";
}

function execute(data) {
    let input;
    try {
        input = JSON.parse(data);
    } catch (error) {
        return Response.error("Invalid playback data");
    }
    if (!input.payload || !input.referer) return Response.error("Missing playback data");

    let html;
    try {
        html = CryptoJS.enc.Base64.parse(input.payload).toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return Response.error("Invalid server payload");
    }
    let iframe = html.match(/<iframe[^>]+src=['\"]([^'\"]+)['\"]/i);
    if (!iframe) return Response.error("Server embed not found");
    let embed = iframe[1].split("&" + "amp;").join("&");
    if (embed.indexOf("//") === 0) embed = "https:" + embed;

    if (/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(embed)) return playback(embed, "native", input.referer);

    // ponytail: Blogger private RPC is intentionally left to vBook auto-sniffing; add a resolver only if auto playback stops working.
    if (embed.indexOf("blogger.com/") === -1) {
        let response = fetchPage(embed, input.referer);
        if (response.ok) {
            let stream = directStream(response.text());
            if (stream) return playback(stream, "native", embed);
        }
    }

    return playback(embed, "auto", input.referer);
}
