load('config.js');

function execute(url) {
    try {
        var doc = ntDoc(url);
        var name = doc.select('h1.title-detail').text();
        if (!name) return Response.error('Không tìm thấy thông tin truyện.');
        var tags = [];
        doc.select('.list-info .kind a[href]').forEach(function (link) {
            tags.push({ title: link.text(), input: link.attr('href'), script: 'search.js' });
        });
        var status = String(doc.select('.list-info .status .col-xs-8').text());
        var book = {
            name: name,
            author: doc.select('.list-info .author .col-xs-8').text(),
            cover: doc.select('.detail-info .col-image img').attr('src'),
            description: doc.select('.detail-content p').html(),
            detail: status,
            url: ntUrl(url),
            type: 'comic',
            format: 'comic',
            locale: 'vi',
            tags: tags
        };
        if (status) book.ongoing = !/hoàn thành/i.test(status);
        return Response.success(book);
    } catch (error) {
        return Response.error(String(error));
    }
}
