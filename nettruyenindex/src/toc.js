load('config.js');

function execute(url) {
    try {
        var doc = ntDoc(url);
        var chapters = [];
        doc.select('#nt_listchapter .chapter a[href]').forEach(function (link) {
            chapters.push({ name: link.text(), url: ntUrl(link.attr('href')) });
        });
        if (!chapters.length) return Response.error('Không tìm thấy danh sách chương.');
        return Response.success(chapters.reverse());
    } catch (error) {
        return Response.error(String(error));
    }
}
