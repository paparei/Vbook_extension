load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP ' + response.status);
    var doc = response.html();
    if (!doc) return Response.error('Could not parse HTML');

    function firstText(selector) {
        var el = doc.select(selector).first();
        return el ? cleanText(el.text()) : '';
    }

    function firstAttr(selector, attr) {
        var el = doc.select(selector).first();
        return el ? (el.attr(attr) || '') : '';
    }

    var name = firstText('.film-info h1') || firstAttr('meta[property="og:title"]', 'content');
    var originalName = firstText('.film-info h2');
    var cover = firstAttr('meta[property="og:image"]', 'content') || firstAttr('.film-info img.avatar', 'src');
    var description = firstText('#film-content') || firstAttr('meta[property="og:description"]', 'content');
    var genres = [];
    var countries = [];
    var detail = [];
    var ongoing = false;
    var format = doc.select('.server-group').size() > 0 || doc.select('.latest-episode a[href*="/play/"]').size() > 0 ? 'series' : 'movie';

    doc.select('.entry-meta > li').forEach(function (li) {
        var text = cleanText(li.text());
        var label = li.select('label').first();
        var key = label ? cleanText(label.text()).replace(/:$/, '') : '';
        if (!text) return;
        if (key === 'Thể loại') {
            li.select('a').forEach(function (a) {
                var title = cleanText(a.text());
                if (title) genres.push({ title: title, input: normalizeUrl(a.attr('href')), script: 'gen.js' });
            });
        } else if (key === 'Quốc gia') {
            li.select('a').forEach(function (a) {
                var country = cleanText(a.text());
                if (country && countries.indexOf(country) < 0) countries.push(country);
            });
        }
        if (key) detail.push(text);
        if (text.indexOf('Đang phát') >= 0 && text.indexOf('Hoàn Tất') < 0) ongoing = true;
        var progress = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (progress && parseInt(progress[1], 10) < parseInt(progress[2], 10)) ongoing = true;
    });

    if (originalName) detail.unshift('Tên gốc: ' + originalName);
    if (countries.length) detail.push('Quốc gia: ' + countries.join(', '));

    var suggests = genres.length ? [{ title: 'Phim cùng thể loại: ' + genres[0].title, input: genres[0].input, script: 'gen.js' }] : [];
    return Response.success({
        name: name.replace(/\s*\|.*$/, '').replace(/\s+-\s+Xem Phim.*$/i, '').trim() || 'PhimTV',
        cover: normalizeAssetUrl(cover),
        author: 'PhimTV',
        description: description,
        detail: detail.join('<br>'),
        ongoing: ongoing,
        genres: genres,
        suggests: suggests,
        format: format,
        host: BASE_URL
    });
}
