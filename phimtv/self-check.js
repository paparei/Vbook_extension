const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const root = __dirname;
const src = path.join(root, 'src');
let fixture = '';
let requests = [];

function wrap(selection) {
    return {
        select(selector) { return wrap(selection.find(selector)); },
        first() { return selection.length ? wrap(selection.first()) : null; },
        forEach(callback) { selection.each(function () { callback(wrap(cheerio.load('<root></root>')(this))); }); },
        size() { return selection.length; },
        attr(name) { return selection.attr(name) || ''; },
        text() { return selection.text(); }
    };
}

function documentOf(html) {
    return wrap(cheerio.load(html).root());
}

global.Response = {
    success(data, next) { return { ok: true, data: data, next: next }; },
    error(error) { return { ok: false, error: error }; }
};
global.fetch = function (url, options) {
    requests.push({ url: url, options: options || {} });
    return {
        ok: true,
        status: 200,
        html() { return documentOf(fixture); },
        text() { return fixture; }
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
assert.strictEqual(manifest.metadata.name, 'PhimTV');
assert.strictEqual(manifest.metadata.type, 'video');
Object.keys(manifest.script).forEach(function (name) {
    assert.ok(fs.existsSync(path.join(src, manifest.script[name])), 'missing ' + name);
});

assert.strictEqual(run('home.js')().data.length, 5);

fixture = '<ul class="pagination"><li><a href="/?page=2">2</a></li></ul>' +
    '<li class="item"><span class="label"><div class="status">Hoàn Tất (12/12) Vietsub</div></span>' +
    '<a title="Phi Vụ Chung Cư" href="/phim/phi-vu-chung-cu-22278.html"><img data-src="//img.phimtv.cv/poster.jpg"><h3>Phi Vụ Chung Cư</h3></a></li>';
let result = run('gen.js')('https://phimtv.cv/vod/phim-moi', '1');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.next, '2');
assert.deepStrictEqual(result.data[0], {
    name: 'Phi Vụ Chung Cư',
    link: 'https://phimtv.cv/phim/phi-vu-chung-cu-22278.html',
    cover: 'https://img.phimtv.cv/poster.jpg',
    tag: 'Hoàn Tất (12/12) Vietsub',
    host: 'https://phimtv.cv'
});

fixture = '<div class="film-info"><h1>Phi Vụ Chung Cư</h1><h2>The Apartment Job (2026)</h2>' +
    '<img class="avatar" src="/poster.jpg"></div>' +
    '<div class="latest-episode"><a href="/play/phi-vu-chung-cu%E2%80%90tap-1-1.html">Tập 1</a></div>' +
    '<ul class="entry-meta"><li><label>Đang phát: </label><span>Hoàn Tất (12/12)</span></li>' +
    '<li><label>Thể loại: </label><a href="/genre/hanh-dong">Hành Động</a></li>' +
    '<li><label>Quốc gia: </label><a href="/country/han-quoc">Hàn Quốc</a></li></ul>' +
    '<div id="film-content"><p>Nội dung phim</p></div>';
result = run('detail.js')('https://phimtv.cv/phim/phi-vu-chung-cu-22278.html');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.name, 'Phi Vụ Chung Cư');
assert.strictEqual(result.data.format, 'series');
assert.strictEqual(result.data.ongoing, false);
assert.strictEqual(result.data.genres[0].input, 'https://phimtv.cv/genre/hanh-dong');

fixture = '<div class="server-group"><div>Danh sách tập #1 Vietsub</div><ul class="episodes">' +
    '<li><a href="/play/a%E2%80%90tap-1-1.html">Tập 1</a></li></ul></div>' +
    '<div class="server-group"><div>Danh sách tập #2 Thuyết Minh</div><ul class="episodes">' +
    '<li><a href="/play/a%E2%80%90tap-1-2.html">Tập 1</a></li></ul></div>';
result = run('toc.js')('https://phimtv.cv/phim/a-1.html');
assert.strictEqual(result.data.length, 2);
assert.strictEqual(result.data[0].name, 'Vietsub - Tập 1');
assert.strictEqual(result.data[1].name, 'Thuyết Minh - Tập 1');

fixture = '<div class="streaming-server" data-type="m3u8" data-link="http://video.example/index.m3u8">PPRO#1</div>' +
    '<div class="streaming-server" data-type="embed" data-link="https://embed.example/player">PNA#2</div>';
result = run('chap.js')('https://phimtv.cv/play/a%E2%80%90tap-1-1.html');
assert.strictEqual(result.data.length, 2);
let first = JSON.parse(result.data[0].data);
assert.strictEqual(first.type, 'native');
assert.strictEqual(first.url, 'https://video.example/index.m3u8');
result = run('track.js')(result.data[0].data);
assert.strictEqual(result.data.type, 'native');
assert.strictEqual(result.data.data, 'https://video.example/index.m3u8');
assert.strictEqual(result.data.headers.Referer, 'https://phimtv.cv/');

console.log('PhimTV self-check PASS');
