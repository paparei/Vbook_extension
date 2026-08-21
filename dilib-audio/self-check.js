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
assert.strictEqual(manifest.metadata.type, 'audio');
assert.strictEqual(manifest.metadata.version, 3);
['home', 'genre', 'gen', 'detail', 'search', 'toc', 'chap', 'track'].forEach(function (name) {
    assert.ok(manifest.script[name], 'missing script: ' + name);
    assert.ok(fs.existsSync(path.join(src, manifest.script[name])), 'missing file: ' + manifest.script[name]);
});

let result = run('home.js')();
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 6);
assert.strictEqual(result.data[0].input, 'https://dilib.vn/sach-noi/');
assert.strictEqual(result.data[1].input, 'https://dilib.vn/radio/');

result = run('genre.js')();
assert.strictEqual(result.ok, true);
assert.ok(result.data.some(function (item) { return item.title === 'Radio Truyện Dài Kỳ'; }));

fixture = {
    status: 200,
    html: '<a class="woocommerce-LoopProduct-link" href="/tien-nghich-14531.html">' +
        '<img src="/img/news/2023/08/thumb/14531.webp" alt="Tiên Nghịch"><span>Radio: 89:04:19</span></a>' +
        '<a class="woocommerce-LoopProduct-link" href="/tien-nghich-14531.html">Tiên Nghịch (Nhĩ Căn)</a>' +
        '<a href="/sach-noi/page/2">2</a>'
};
requests = [];
result = run('gen.js')('https://dilib.vn/sach-noi/', '1');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.next, '2');
assert.deepStrictEqual(result.data[0], {
    name: 'Tiên Nghịch (Nhĩ Căn)',
    link: 'https://dilib.vn/tien-nghich-14531.html',
    cover: 'https://dilib.vn/img/news/2023/08/thumb/14531.webp',
    description: 'Radio: 89:04:19',
    host: 'https://dilib.vn'
});

fixture = {
    status: 200,
    html: '<a class="woocommerce-LoopProduct-link" href="/tien-nghich-14531.html"><img src="/img/news/2023/08/thumb/14531.webp" alt="Tiên Nghịch"></a>'
};
[
    ['https://dilib.vn/sach-noi', 'https://dilib.vn/sach-noi/'],
    ['/sach-noi/', 'https://dilib.vn/sach-noi/'],
    ['sach-noi', 'https://dilib.vn/sach-noi/'],
    ['https://dilib.vn/radio', 'https://dilib.vn/radio/'],
    ['radio/radio-truyen-dai-ky', 'https://dilib.vn/radio/radio-truyen-dai-ky/'],
    ['https://dilib.vn/sach-noi/page/2', 'https://dilib.vn/sach-noi/page/2']
].forEach(function (test) {
    requests = [];
    assert.strictEqual(run('gen.js')(test[0], test[0].indexOf('page/2') >= 0 ? '2' : '1').ok, true);
    assert.strictEqual(requests[0].url, test[1]);
});

fixture = {
    status: 200,
    html: '<div>Có 25 kết quả được tìm thấy!</div>' +
        '<a class="woocommerce-LoopProduct-link" href="/tien-nghich-14531.html">' +
        '<img src="/img/news/2023/08/thumb/14531.webp" alt="Tiên Nghịch"></a>'
};
requests = [];
result = run('search.js')('tien', '1');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.next, '2');
assert.strictEqual(requests.length, 3);
assert.ok(requests.some(function (request) { return request.url.indexOf('media=2') >= 0; }));
assert.ok(requests.some(function (request) { return request.url.indexOf('media=6') >= 0; }));

fixture = {
    status: 200,
    html: '<meta property="og:title" content="Radio Sách Tiên Nghịch, Thư Viện Số">' +
        '<meta property="og:image" content="/img/news/2023/08/larger/14531.webp">' +
        '<meta property="og:description" content="Tiên Nghịch - Radio sách nói, Thư Viện Số">' +
        '<div class="primary"><h1>TIÊN NGHỊCH</h1>' +
        '<div>Tác giả : Nhĩ CănThời lượng : 89:04:19Định dạng : MP3Phân loại : RadioTình trạng : Hoàn thành</div>' +
        '<audio src="/img/audio/14531-tien-nghich-thuviensach.vn.mp3"></audio></div>'
};
result = run('detail.js')('https://dilib.vn/tien-nghich-14531.html');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.name, 'TIÊN NGHỊCH');
assert.strictEqual(result.data.author, 'Nhĩ Căn');
assert.strictEqual(result.data.type, 'audio');
assert.strictEqual(result.data.format, 'audio');
assert.ok(result.data.detail.indexOf('89:04:19') >= 0);

result = run('toc.js')('https://dilib.vn/tien-nghich-14531.html');
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data, [{
    name: 'Nghe toàn bộ',
    url: 'https://dilib.vn/tien-nghich-14531.html',
    host: 'https://dilib.vn'
}]);

result = run('chap.js')('https://dilib.vn/tien-nghich-14531.html');
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data, [{
    title: 'Dilib',
    data: 'https://dilib.vn/tien-nghich-14531.html'
}]);

result = run('track.js')(result.data[0].data);
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data, {
    type: 'native',
    data: 'https://dilib.vn/img/audio/14531-tien-nghich-thuviensach.vn.mp3',
    host: 'https://dilib.vn',
    mimeType: 'audio/mpeg',
    headers: {
        Referer: 'https://dilib.vn/tien-nghich-14531.html',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }
});

fixture = {
    status: 200,
    html: '<h1>PDF only</h1><div class="primary"></div>'
};
assert.strictEqual(run('detail.js')('https://dilib.vn/pdf-only-1.html').ok, false);
assert.strictEqual(run('chap.js')('https://evil.example/item-1.html').ok, false);
assert.strictEqual(run('track.js')('https://evil.example/item-1.html').ok, false);

fixture = { status: 404, html: '' };
assert.strictEqual(run('gen.js')('https://dilib.vn/radio/', '1').ok, false);

console.log('Dilib audio self-check PASS');
