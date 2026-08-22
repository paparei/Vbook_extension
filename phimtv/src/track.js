load('config.js');

function execute(input) {
    var data = {};
    try {
        data = JSON.parse(input);
    } catch (e) {
        data = { url: input, type: 'auto' };
    }
    if (!data.url) return Response.error('Missing media URL');
    return Response.success({
        data: data.url,
        type: data.type || 'auto',
        headers: {
            'Referer': data.referer || DEFAULT_REFERER,
            'User-Agent': BASE_UA
        }
    });
}
