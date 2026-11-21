load('config.js');
load('catalog.js');

function execute() {
    try {
        var rows = ntMenu(ntDoc('/'), '.main-menu a[href^="/danh-sach-truyen"]');
        rows.unshift({title: 'Trang chủ', input: '/', script: 'search.js'});
        return Response.success(rows);
    } catch (e) { return Response.error(String(e)); }
}
