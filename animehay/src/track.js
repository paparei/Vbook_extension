load('config.js');

// track.js — Stream resolver cho AnimeHay
// Nhận data từ chap.js dạng JSON: { url, type, referer }
// type: 'native' cho m3u8, 'auto' cho embed

function execute(input) {
    var data = {};
    try {
        data = JSON.parse(input);
    } catch (e) {
        data = { url: input, type: 'auto' };
    }

    var streamUrl = data.url || '';
    var streamType = data.type || 'auto';
    var referer = data.referer || DEFAULT_REFERER;

    return Response.success({
        data: streamUrl,
        type: streamType,
        headers: {
            'Referer': referer,
            'User-Agent': BASE_UA
        }
    });
}
