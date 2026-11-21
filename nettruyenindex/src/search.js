load('config.js');
load('catalog.js');

function execute(query, page) {
    try {
        query = String(query || '').trim();
        var path = '/';
        if (page) {
            path = String(page);
            if (!/^\/(search|the-loai|danh-sach-truyen)\//.test(path)) return Response.error('Trang không hợp lệ.');
        } else if (/^\/(the-loai\/|danh-sach-truyen(?:\/|\?|$))/.test(query)) {
            path = query;
        } else if (query && query !== '/') {
            path = '/search?keyword=' + encodeURIComponent(query);
        }
        var doc = ntDoc(path);
        if (!doc.select('.items').first()) return Response.error('Không tìm thấy danh sách truyện.');
        var items = ntCards(doc.select('.items .item'), '.chapter a');
        var current = doc.select('.pagination li.active a').first();
        var following = doc.select('.pagination li.active + li a').first();
        var next = '';
        if (items.length && current && following && Number(following.text()) === Number(current.text()) + 1) {
            next = String(following.attr('href'));
        }
        return Response.success(items, next);
    } catch (e) { return Response.error(String(e)); }
}
