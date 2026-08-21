const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const root = __dirname;
const src = path.join(root, 'src');
let fixture = { status: 200, html: '' };
let requests = [];

function wrap(selection) {
    return {
        select(selector) { return wrap(selection.find(selector)); },
        first() { return selection.length ? wrap(selection.first()) : null; },
        forEach(callback) { selection.each(function () { callback(wrap(cheerio.load('<root></root>')(this))); }); },
        attr(name) { return selection.attr(name) || ''; },
        text() { return selection.text(); }
    };
}

function htmlDocument(html) {
    const $ = cheerio.load(html);
    return wrap($.root());
}

global.Response = {
    success(data, next) { return { ok: true, data, next }; },
    error(error) { return { ok: false, error }; }
};
global.fetch = function (url, options) {
    requests.push({ url, options });
    return {
        ok: fixture.status >= 200 && fixture.status < 300,
        status: fixture.status,
        text() { return fixture.html; },
        html() { return htmlDocument(fixture.html); }
    };
};
global.load = function (name) {
    (0, eval)(fs.readFileSync(path.join(src, name), 'utf8'));
};

function run(name) {
    load(name);
    return global.execute;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
assert.strictEqual(manifest.metadata.type, 'comic');
assert.strictEqual(manifest.metadata.version, 1);
['home', 'genre', 'gen', 'detail', 'search', 'toc', 'page'].forEach(function (name) {
    assert.ok(manifest.script[name], 'missing script: ' + name);
    assert.ok(fs.existsSync(path.join(src, manifest.script[name])), 'missing file: ' + manifest.script[name]);
});

let result = run('home.js')();
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 6);
assert.strictEqual(result.data[1].input, 'https://dilib.vn/truyen-tranh/manga/');

result = run('genre.js')();
assert.strictEqual(result.ok, true);
assert.ok(result.data.some(function (item) { return item.title === 'Manhwa'; }));

fixture = {
    status: 200,
    html: '<a class="woocommerce-LoopProduct-link" href="/one-piece-14728.html">' +
        '<img src="/img/news/2024/05/thumb/14728.webp" alt="Đảo Hải Tặc - One Piece"><span>1195 Chap</span></a>' +
        '<a class="woocommerce-LoopProduct-link" href="/one-piece-14728.html">Đảo Hải Tặc - One Piece (Oda Eiichiro)</a>' +
        '<a href="/truyen-tranh/page/2">2</a>'
};
requests = [];
result = run('gen.js')('https://dilib.vn/truyen-tranh/', '1');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.next, '2');
assert.deepStrictEqual(result.data[0], {
    name: 'Đảo Hải Tặc - One Piece (Oda Eiichiro)',
    link: 'https://dilib.vn/one-piece-14728.html',
    cover: 'https://dilib.vn/img/news/2024/05/thumb/14728.webp',
    description: '1195 Chap',
    host: 'https://dilib.vn'
});

fixture = {
    status: 200,
    html: '<div>Có 25 kết quả được tìm thấy!</div>' +
        '<a class="woocommerce-LoopProduct-link" href="/one-piece-14728.html">' +
        '<img src="/img/news/2024/05/thumb/14728.webp" alt="One Piece"></a>'
};
requests = [];
result = run('search.js')('one piece', '1');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.next, '2');
assert.ok(requests[0].url.indexOf('find=one+piece') >= 0);
assert.ok(requests[0].url.indexOf('media=5') >= 0);

fixture = {
    status: 200,
    html: '<meta property="og:title" content="Truyện Tranh Đảo Hải Tặc - One Piece, Thư Viện Số">' +
        '<meta property="og:image" content="/img/news/2024/05/larger/14728.webp">' +
        '<meta property="og:description" content="Tác giả: Oda Eiichiro. Định dạng: Hình Ảnh. Phân loại: Truyện Tranh.">' +
        '<div class="primary"><h1>ĐẢO HẢI TẶC - ONE PIECE</h1>' +
        '<div>Tác giả : Oda EiichiroSố Chap : 1195Số trang : 21915Định dạng : Hình ẢnhPhân loại : Truyện TranhTình trạng : Đang cập nhật...</div>' +
        '<a href="/truyen-tranh/manga/">Manga</a>' +
        '<a href="/truyen-tranh/one-piece-14728-chap-1.html">Đọc Truyện</a></div>'
};
result = run('detail.js')('https://dilib.vn/one-piece-14728.html');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.name, 'ĐẢO HẢI TẶC - ONE PIECE');
assert.strictEqual(result.data.author, 'Oda Eiichiro');
assert.ok(result.data.detail.indexOf('1195') >= 0);
assert.strictEqual(result.data.ongoing, true);
assert.strictEqual(result.data.genres[0].title, 'Manga');

fixture = {
    status: 200,
    html: '<a href="/truyen-tranh/one-piece-14728-chap-10.html">Chap 10</a>' +
        '<a href="/truyen-tranh/one-piece-14728-chap-1.html">Chap 1</a>' +
        '<a href="/truyen-tranh/one-piece-14728-chap-10.html">Latest</a>'
};
result = run('toc.js')('https://dilib.vn/one-piece-14728.html');
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data.map(function (item) { return item.name; }), ['Chap 1', 'Chap 10']);

fixture = {
    status: 200,
    html: '<img src="/img/news/2024/05/larger/14728.webp">' +
        '<div><img src="/img/comic/One-Piece/img_00002.webp?v=4.90"></div>' +
        '<img src="/img/comic/One-Piece/img_00003.webp?v=4.90">'
};
result = run('page.js')('https://dilib.vn/truyen-tranh/one-piece-14728-chap-1.html');
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data, [
    'https://dilib.vn/img/comic/One-Piece/img_00002.webp?v=4.90',
    'https://dilib.vn/img/comic/One-Piece/img_00003.webp?v=4.90'
]);

assert.strictEqual(run('detail.js')('https://evil.example/book-1.html').ok, false);
assert.strictEqual(run('page.js')('https://dilib.vn/one-piece-14728.html').ok, false);
fixture = { status: 404, html: '' };
assert.strictEqual(run('gen.js')('https://dilib.vn/truyen-tranh/', '1').ok, false);

console.log('Dilib self-check PASS');
