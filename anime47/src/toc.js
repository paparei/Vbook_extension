load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var m = url.match(/m(\d+)\.html/) || url.match(/-(\d+)(?:\.html)?\/?$/);
    if (!m) return Response.error('Không đọc được mã phim');
    var id = m[1];

    var j = fetchJson(API_URL + '/anime/' + id + '/episodes', true);
    var data = j ? (j.data || j) : null;
    var teams = data && data.teams ? data.teams : [];

    var list = [];
    for (var t = 0; t < teams.length; t++) {
        var groups = teams[t].groups || [];
        for (var g = 0; g < groups.length; g++) {
            var group = groups[g];
            var eps = group.episodes || [];
            if (!eps.length) continue;
            if (teams.length > 1 || groups.length > 1) {
                list.push({ name: ((teams[t].team_name || teams[t].name || 'Server') + ' • ' + (group.name || ('Nhóm ' + (g + 1)))) + '', type: 'section' });
            }
            for (var e = 0; e < eps.length; e++) {
                var ep = eps[e];
                var epUrl = ep.link || (ep.id ? ('/xem/ep-' + (ep.number || e + 1) + '-' + ep.id) : '');
                if (!epUrl) continue;
                list.push({
                    name: (ep.title || ('Tập ' + (ep.number || e + 1))) + '',
                    url: normalizeUrl(epUrl),
                    host: BASE_URL
                });
            }
        }
    }

    if (!list.length) return Response.error('Không tải được danh sách tập (cần đăng nhập tài khoản trong cài đặt)');
    return Response.success(list);
}
