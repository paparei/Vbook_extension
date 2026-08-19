load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var response = fetchPage(url);
    if (!response.ok) return Response.error('HTTP Error: ' + response.status);

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

    // Name
    var name = firstText('h1.movie-title-detail');
    if (!name) {
        var rawOg = firstAttr('meta[property="og:title"]', 'content');
        name = rawOg.replace(/^phim\s+/i, '').replace(/\s*(tập\s*\d+.*|vietsub.*)$/i, '').trim();
    }
    if (name) name = name.replace(/\s*HD\s*Vietsub.*$/i, '').trim();

    // Original title
    var originalName = firstText('h2.movie-original-title');

    // Cover
    var cover = firstAttr('.movie-box-img img.thumbnail', 'src');
    if (!cover) cover = firstAttr('meta[property="og:image"]', 'content');
    cover = normalizeUrl(cover);

    // Description — remove h2 trước khi lấy text
    var description = '';
    var descEl = doc.select('.content-detail').first();
    if (descEl) {
        descEl.select('h2').forEach(function (h) { h.remove(); });
        description = cleanText(descEl.text());
    }
    if (!description) description = firstAttr('meta[property="og:description"]', 'content');

    // Metadata
    var detailParts = [];
    var status = '';
    var genres = [];
    var formatType = 'series';

    if (originalName) detailParts.push('Tên gốc: ' + originalName);

    doc.select('.meta-item').forEach(function (item) {
        var label = cleanText(item.select('.meta-label').text());
        var valueEl = item.select('.meta-value');
        var value = cleanText(valueEl.text());

        if (label.indexOf('Trạng thái') >= 0) {
            status = value;
            detailParts.push('Trạng thái: ' + value);
        } else if (label.indexOf('Thể loại') >= 0 && valueEl.select('a').size() === 0) {
            // "Thể loại: Series" hoặc "Phim Lẻ" — không có link
            if (value.toLowerCase().indexOf('phim l') >= 0 || value.toLowerCase() === 'movie') {
                formatType = 'movie';
            }
            detailParts.push('Loại: ' + value);
        } else if (label.indexOf('Thể loại') >= 0 && valueEl.select('a').size() > 0) {
            valueEl.select('a').forEach(function (a) {
                var gName = cleanText(a.text());
                if (gName && gName.toLowerCase() !== 'tất cả') {
                    genres.push({ 
                        title: gName, 
                        input: normalizeUrl(a.attr('href')),
                        script: 'gen.js'
                    });
                }
            });
        } else if (label.indexOf('Chất lượng') >= 0) {
            detailParts.push('Chất lượng: ' + value);
        } else if (label.indexOf('Năm phát hành') >= 0) {
            detailParts.push('Năm: ' + value);
        }
    });

    // Fallback "Thời lượng" — site dùng class typo "metauscript-item"
    doc.select('.metauscript-item').forEach(function (item) {
        var label = cleanText(item.select('.meta-label').text());
        if (label.indexOf('Thời lượng') >= 0) {
            detailParts.push('Thời lượng: ' + cleanText(item.select('.meta-value').text()));
        }
    });

    // Fallback genre
    if (genres.length === 0) {
        var ogSection = firstAttr('meta[property="article:section"]', 'content');
        if (ogSection) {
            genres.push({
                title: ogSection,
                input: BASE_URL + '/' + ogSection.toLowerCase().replace(/\s+/g, '-') + '/',
                script: 'gen.js'
            });
        }
    }

    // Ongoing: 2 trạng thái cơ bản — "Đang chiếu" hoặc "Kết thúc"
    var statusLower = status.toLowerCase();
    var ongoing = false;
    if (statusLower.indexOf('đang chiếu') >= 0 || statusLower.indexOf('ongoing') >= 0) {
        ongoing = true;
    } else if (statusLower.indexOf('kết thúc') >= 0 || statusLower.indexOf('full') >= 0 || 
               statusLower.indexOf('completed') >= 0 || statusLower.indexOf('hoàn thành') >= 0) {
        ongoing = false;
    } else if (status === '' || status === 'N/A') {
        // Nếu không tìm thấy status, mặc định là false (đã kết thúc)
        ongoing = false;
    } else {
        // Status có giá trị khác — kiểm tra xem có khá tương tự "đang chiếu" không
        ongoing = statusLower.indexOf('đang') >= 0;
    }

    // Suggests — Chỉ trả về 1 mục gợi ý duy nhất theo thể loại chính (giống hhkungfu)
    var suggests = [];
    if (genres.length > 0) {
        suggests.push({
            title: 'Phim cùng thể loại: ' + genres[0].title,
            input: genres[0].input,
            script: 'gen.js'
        });
    } else {
        suggests.push({
            title: 'Xem thêm Anime mới',
            input: BASE_URL + '/anime-moi-cap-nhat/',
            script: 'gen.js'
        });
    }

    return Response.success({
        name: name || 'AnimeVsub',
        cover: cover || '',
        author: 'AnimeVsub',
        description: description || '',
        detail: detailParts.join('<br>'),
        ongoing: ongoing,
        genres: genres,
        suggests: suggests,
        format: formatType,
        host: BASE_URL
    });
}