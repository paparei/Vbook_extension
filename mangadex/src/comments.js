load('config.js');

function execute(threadId, page) {
    page = parseInt(page || '1', 10) || 1;
    if (!/^\d+$/.test(String(threadId))) return Response.error('Thread bình luận không hợp lệ');

    var response = fetch(FORUM_URL + '/threads/' + threadId + '/page-' + page, { timeout: 30000 });
    if (!response.ok) return Response.error('Không tải được bình luận (HTTP ' + response.status + ')');
    var doc = response.html();

    var items = [];
    var posts = doc.select('article.message');
    for (var i = 0; i < posts.size(); i++) {
        var post = posts.get(i);
        var body = post.select('.message-body .bbWrapper');
        // The thread's first post is MangaDex's auto-generated announcement with an empty body.
        if (body.isEmpty() || !body.text()) continue;
        var avatar = post.select('.message-avatar img').attr('src');
        items.push({
            name: post.attr('data-author'),
            avatar: avatar ? (avatar.indexOf('http') === 0 ? avatar : FORUM_URL + avatar) : '',
            content: body.html(),
            description: post.select('.message-attribution time').text(),
            replies: []
        });
    }

    var next = doc.select('a.pageNav-jump--next').isEmpty() ? '' : String(page + 1);
    return Response.success(items, next);
}
