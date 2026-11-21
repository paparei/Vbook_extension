load('config.js');
load('catalog.js');

function execute() {
    try {
        var doc = ntDoc('/'), sections = [];
        var picks = ntCards(doc.select('.owl-carousel .item'), '.slide-caption > a');
        if (picks.length) sections.push({id: 'picks', title: 'Truyện đề cử', type: 'horizontal_list', items: picks});
        var tabs = ntMenu(doc, '.main-menu a[href^="/danh-sach-truyen"]');
        if (tabs.length) sections.push({id: 'browse', title: 'Danh sách truyện', type: 'chip', items: tabs.map(function (tab) {
            return {name: tab.title, action: {type: 'list', name: tab.title, script: tab.script, input: tab.input}};
        })});
        var latest = ntCards(doc.select('.items .item'), '.chapter a');
        if (latest.length) sections.push({id: 'latest', title: 'Mới cập nhật', type: 'grid', items: latest,
            more: {type: 'list', name: 'Mới cập nhật', script: 'search.js', input: '/'}});
        return sections.length ? Response.success(sections) : Response.error('Không tìm thấy danh sách truyện.');
    } catch (e) { return Response.error(String(e)); }
}
