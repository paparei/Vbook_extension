load('config.js');

function execute(input) {
    var data = null;
    try {
        data = JSON.parse(input);
    } catch (e) {
        data = { url: input, type: 'auto', referer: BASE_URL };
    }

    var streamUrl = data.url || input;
    var streamType = data.type || (streamUrl.indexOf('.m3u8') !== -1 ? 'native' : 'auto');
    var referer = data.referer || BASE_URL;

    var headers = {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Referer': referer,
        'Origin': BASE_URL
    };

    var token = getSetting('auth_token');
    if (token) {
        headers['Authorization'] = token.indexOf('Bearer ') === 0 ? token : ('Bearer ' + token);
    }

    return Response.success({
        data: streamUrl,
        type: streamType,
        headers: headers
    });
}
