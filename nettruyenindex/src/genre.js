load('config.js');
load('catalog.js');

function execute() {
    try {
        var rows = ntMenu(ntDoc('/'), '.main-menu a[href^="/the-loai/"]');
        return rows.length ? Response.success(rows) : Response.error('Không tìm thấy thể loại.');
    } catch (e) { return Response.error(String(e)); }
}
