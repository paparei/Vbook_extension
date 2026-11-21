var BASE_URL = 'https://nettruyen16s.com';
try {
    var setting = String(DOMAIN).trim().replace(/\/+$/, '');
    if (/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(setting)) BASE_URL = setting;
} catch (e) {}
var ntBase = BASE_URL;

function ntUrl(input) {
    var path = String(input).replace(/^(?:https?:)?\/\/[^/?#]+/i, '');
    return ntBase + '/' + path.replace(/^\/+/, '');
}

function ntDoc(input) {
    var res = fetch(ntUrl(input));
    if (!res || !res.ok) throw new Error('Không tải được NetTruyen' + (res ? ' (HTTP ' + res.status + ')' : ''));
    return res.html();
}
