load('config.js');

function execute(url) {
    url = normalizePageUrl(url);
    if (!isItemUrl(url)) return Response.error('URL audio Dilib không hợp lệ');
    return Response.success([{ title: 'Dilib', data: url }]);
}
