var BASE_URL = "https://weebcentral.com";
try {
    if (DOMAIN) BASE_URL = String(DOMAIN).replace(/\/+$/, "");
} catch (error) {}

function normalizeUrl(url) {
    if (!/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(BASE_URL)) return "";
    var path = String(url || "").replace(/^https?:\/\/[a-z0-9.-]+(?::\d+)?/i, "");
    if (!/^\/(series|chapters)\/[0-9A-Z]{26}(\/[^\s?#\\]*)?\/?$/.test(path)) return "";
    return BASE_URL + path.replace(/\/+$/, "");
}

function imageUrl(url) {
    url = String(url || "");
    if (/^https?:\/\/[^\s]+$/.test(url)) return url;
    if (/^\/\/[^\s]+$/.test(url)) return "https:" + url;
    return /^\/[^\s]+$/.test(url) ? BASE_URL + url : "";
}
