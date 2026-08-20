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

    // === Name ===
    var name = firstText('h1');
    if (!name) {
        var rawOg = firstAttr('meta[property="og:title"]', 'content');
        name = rawOg.replace(/\s*-\s*Anime Vietsub.*$/i, '').trim();
    }

    // === Original title (h2 text-gray-400 ngay sau h1) ===
    var originalName = firstText('h2.text-gray-400');
    if (!originalName) originalName = firstText('h2.text-xl.text-gray-400');

    // === Cover ===
    // Ưu tiên og:image (luôn có sẵn trong SSR)
    var cover = firstAttr('meta[property="og:image"]', 'content');
    if (!cover) {
        // Fallback: poster img trong sidebar
        var posterEl = doc.select('img[alt*="Poster"]').first();
        if (!posterEl) posterEl = doc.select('.rounded-lg img').first();
        if (posterEl) cover = posterEl.attr('src') || '';
    }
    cover = normalizeAssetUrl(cover);

    // === Description ===
    var description = '';
    var descEl = doc.select('.prose-invert').first();
    if (descEl) {
        description = cleanText(descEl.text());
    }
    if (!description) {
        descEl = doc.select('article#content').first();
        if (descEl) description = cleanText(descEl.text());
    }
    if (!description) description = firstAttr('meta[property="og:description"]', 'content');

    // === Metadata from structured data (ld+json) ===
    var detailParts = [];
    var genres = [];
    var formatType = 'series';
    var ongoing = false;

    if (originalName) detailParts.push('Tên gốc: ' + originalName);

    // === Extract Genres & Country directly from DOM (Precise, avoids header menu) ===
    var seenG = {};
    doc.select('div.mb-4:contains(Thể loại) a[href*="/the-loai/"]').forEach(function (a) {
        var gName = cleanText(a.text());
        var gLink = normalizeUrl(a.attr('href'));
        if (gName && gName.toLowerCase() !== 'thể loại' && !seenG[gName]) {
            seenG[gName] = true;
            genres.push({
                title: gName,
                input: gLink,
                script: 'gen.js'
            });
        }
    });

    var countries = [];
    doc.select('div.mb-4:contains(Quốc gia) a[href*="/quoc-gia/"]').forEach(function (a) {
        var cName = cleanText(a.text());
        if (cName) {
            var exists = false;
            for (var i = 0; i < countries.length; i++) {
                if (countries[i] === cName) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                countries.push(cName);
            }
        }
    });
    if (countries.length > 0) {
        detailParts.push('Quốc gia: ' + countries.join(', '));
    }

    // Lấy dữ liệu từ ld+json schema (chỉ dùng làm fallback hoặc cho rating/format)
    var ldJsonEls = doc.select('script[type="application/ld+json"]');
    var ldData = null;
    ldJsonEls.forEach(function (el) {
        try {
            var parsed = JSON.parse(el.data());
            if (parsed['@type'] === 'TVSeries' || parsed['@type'] === 'Movie') {
                ldData = parsed;
            } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
                parsed['@graph'].forEach(function (item) {
                    if (item['@type'] === 'TVSeries' || item['@type'] === 'Movie') {
                        ldData = item;
                    }
                });
            }
        } catch (e) {}
    });

    if (ldData) {
        // Fallback Genres từ schema nếu DOM trống
        if (genres.length === 0 && ldData.genre) {
            var genreArr = ldData.genre;
            if (typeof genreArr === 'string') genreArr = [genreArr];
            genreArr.forEach(function (g) {
                var slug = g.toLowerCase()
                    .replace(/[àáạảãăắằẳẵặâấầẩẫậ]/g, 'a')
                    .replace(/[èéẹẻẽêếềểễệ]/g, 'e')
                    .replace(/[ìíịỉĩ]/g, 'i')
                    .replace(/[òóọỏõôốồổỗộơớờởỡợ]/g, 'o')
                    .replace(/[ùúụủũưứừửữự]/g, 'u')
                    .replace(/[ỳýỵỷỹ]/g, 'y')
                    .replace(/đ/g, 'd')
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                if (!seenG[g]) {
                    seenG[g] = true;
                    genres.push({
                        title: g,
                        input: BASE_URL + '/the-loai/' + slug,
                        script: 'gen.js'
                    });
                }
            });
        }

        // Movie hoặc Series
        if (ldData['@type'] === 'Movie') {
            formatType = 'movie';
        }

        // Rating
        if (ldData.aggregateRating) {
            detailParts.push('Đánh giá: ' + ldData.aggregateRating.ratingValue + '/10 (' + ldData.aggregateRating.ratingCount + ' đánh giá)');
        }

        // Fallback Country nếu DOM trống
        var hasCountry = false;
        detailParts.forEach(function (part) {
            if (part.indexOf('Quốc gia') >= 0) hasCountry = true;
        });
        if (!hasCountry && ldData.countryOfOrigin) {
            var schemaCountries = [];
            var countryArr = Array.isArray(ldData.countryOfOrigin) ? ldData.countryOfOrigin : [ldData.countryOfOrigin];
            countryArr.forEach(function (c) {
                if (c && c.name) schemaCountries.push(c.name);
            });
            if (schemaCountries.length > 0) detailParts.push('Quốc gia: ' + schemaCountries.join(', '));
        }
    }

    // === Year / Episodes from DOM ===
    // "Năm sản xuất: 1996" — span chứa "Năm sản xuất"
    var infoSpans = doc.select('.flex.items-center.gap-4 span');
    if (infoSpans.size() === 0) {
        infoSpans = doc.select('span');
    }
    infoSpans.forEach(function (span) {
        var txt = cleanText(span.text());
        if (txt.indexOf('Năm sản xuất') >= 0) {
            var alreadyHas = false;
            detailParts.forEach(function (part) {
                if (part.indexOf('Năm sản xuất') >= 0) alreadyHas = true;
            });
            if (!alreadyHas) detailParts.push(txt);
        } else if (txt.indexOf('Tập') >= 0 && txt.indexOf('/') >= 0) {
            var alreadyHas = false;
            detailParts.forEach(function (part) {
                if (part.indexOf('Tập') >= 0) alreadyHas = true;
            });
            if (!alreadyHas) {
                detailParts.push('Tập: ' + txt);
                // Nếu "Tập X / Y" và X < Y thì ongoing
                var epMatch = txt.match(/(\d+)\s*\/\s*(\d+)/);
                if (epMatch && parseInt(epMatch[1]) < parseInt(epMatch[2])) {
                    ongoing = true;
                }
            }
        }
    });

    // Breadcrumb để xác định format
    var breadcrumbs = doc.select('nav[aria-label="Breadcrumb"] a');
    breadcrumbs.forEach(function (a) {
        var txt = cleanText(a.text()).toLowerCase();
        if (txt === 'phim lẻ' || txt.indexOf('phim-le') >= 0) {
            formatType = 'movie';
        }
    });

    // === Suggests ===
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
            input: BASE_URL + '/danh-sach',
            script: 'gen.js'
        });
    }

    return Response.success({
        name: name || 'AnimeHay',
        cover: cover || '',
        author: 'AnimeHay',
        description: description || '',
        detail: detailParts.join('<br>'),
        ongoing: ongoing,
        genres: genres,
        suggests: suggests,
        format: formatType,
        host: BASE_URL
    });
}
