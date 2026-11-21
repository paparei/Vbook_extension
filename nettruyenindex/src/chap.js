load('config.js');

function execute(url) {
    try {
        var doc = ntDoc(url);
        var pages = [];
        // The site brackets the actual CDN pages with two copies of a banner without data-cdn.
        doc.select('#image_container .page-chapter img[data-cdn]').forEach(function (img) {
            var src = String(img.attr('data-original') || img.attr('src'));
            if (/^https?:\/\//i.test(src)) pages.push(src);
        });
        if (!pages.length) return Response.error('Không tìm thấy ảnh truyện công khai trong chương này.');
        return Response.success(pages);
    } catch (error) {
        return Response.error(String(error));
    }
}
