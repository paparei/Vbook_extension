let BASE_URL = "https://animepahe.ch";
try {
    if (DOMAIN) {
        BASE_URL = String(DOMAIN).replace(/\/+$/, "");
    }
} catch (error) {
}

function normalizeUrl(url) {
    url = String(url || "");
    if (url.indexOf("//") === 0) url = "https:" + url;
    if (/^https?:\/\//i.test(url)) return url.replace(/^https?:\/\/[^\/]+/i, BASE_URL);
    return BASE_URL + (url.charAt(0) === "/" ? "" : "/") + url;
}

function fetchPage(url, referer) {
    return fetch(url, {
        headers: {
            "User-Agent": UserAgent.chrome(),
            "Referer": referer || BASE_URL + "/"
        }
    });
}
