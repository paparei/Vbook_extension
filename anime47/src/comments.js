load('config.js');

function toComment(c) {
    var user = c && c.user ? c.user : {};
    var replies = c && c.replies ? c.replies : [];
    var mapped = [];
    for (var i = 0; i < replies.length; i++) mapped.push(toComment(replies[i]));
    return {
        name: (user.username || '') + '',
        avatar: (user.avatar_url || '') + '',
        content: cleanText(c && c.content ? c.content : ''),
        description: (c && (c.formatted_date || c.created_at) || '') + '',
        replies: mapped
    };
}

function execute(input, page) {
    var id = (input || '') + '';
    if (!/^\d+$/.test(id)) return Response.error('Mã phim không hợp lệ');
    var current = parseInt(page || '1', 10);
    if (!(current > 0)) current = 1;

    var j = fetchJson(API_URL + '/anime/' + id + '/comments?page=' + current + '&per_page=10', false);
    if (!j || !j.data) return Response.error('Không tải được bình luận');
    var comments = [];
    for (var i = 0; i < j.data.length; i++) comments.push(toComment(j.data[i]));
    var p = j.pagination || {};
    var next = parseInt(p.current_page || current, 10) < parseInt(p.last_page || current, 10) ? (current + 1) + '' : '';
    return Response.success(comments, next);
}
