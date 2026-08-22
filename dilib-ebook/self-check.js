const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const cheerio = require('cheerio');

const root = __dirname;
const src = path.join(root, 'src');

function wrap(selection) {
    return {
        select(selector) { return wrap(selection.find(selector)); },
        first() { return selection.length ? wrap(selection.first()) : null; },
        forEach(callback) { selection.each(function () { callback(wrap(cheerio.load('<root></root>')(this))); }); },
        attr(name) { return selection.attr(name) || ''; },
        text() { return selection.text(); },
        html() { return selection.html() || ''; },
        remove() { selection.remove(); }
    };
}

global.Html = {
    parse(html) {
        const $ = cheerio.load(html, { xmlMode: false });
        return wrap($.root());
    }
};
global.load = function (name) {
    (0, eval)(fs.readFileSync(path.join(src, name), 'utf8'));
};

load('config.js');
load('epub.js');

function zip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;

    entries.forEach(function (entry) {
        const name = Buffer.from(entry.name, 'utf8');
        const plain = Buffer.from(entry.content, 'utf8');
        const compressed = entry.method === 0 ? plain : zlib.deflateRawSync(plain, entry.fixed ? { strategy: zlib.constants.Z_FIXED } : {});
        const crc = epubCrc32(Array.from(plain));
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(entry.method, 8);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(plain.length, 22);
        local.writeUInt16LE(name.length, 26);
        locals.push(local, name, compressed);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(entry.method, 10);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(plain.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        centrals.push(central, name);
        offset += local.length + name.length + compressed.length;
    });

    const centralSize = centrals.reduce(function (size, value) { return size + value.length; }, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat(locals.concat(centrals, [end]));
}

const container = '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/content.opf"/></rootfiles></container>';
const opf = '<?xml version="1.0"?><package><metadata><title>Sách thử</title><meta name="cover" content="cover"/></metadata>' +
    '<manifest><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>' +
    '<item id="one" href="text/one.xhtml" media-type="application/xhtml+xml"/>' +
    '<item id="two" href="text/two.html" media-type="application/xhtml+xml"/>' +
    '<item id="outline" href="outline.xhtml" media-type="application/xhtml+xml"/></manifest>' +
    '<spine><itemref idref="cover"/><itemref idref="one"/><itemref idref="two"/><itemref idref="outline"/></spine>' +
    '<guide><reference type="cover" href="cover.xhtml"/></guide></package>';
const archive = zip([
    { name: 'mimetype', content: 'application/epub+zip', method: 0 },
    { name: 'META-INF/container.xml', content: container, method: 8, fixed: true },
    { name: 'OPS/content.opf', content: opf, method: 8 },
    { name: 'OPS/cover.xhtml', content: '<html><body><img src="cover.jpg"/></body></html>', method: 8 },
    { name: 'OPS/text/one.xhtml', content: '<html><head><title>Ignored</title></head><body><h1 id="x">Chương Một</h1><p style="x>y" onclick="bad()">Tiếng Việt: <a href="javascript:bad()">Trời xanh.</a></p><script>bad()</script><img src="x"/></body></html>', method: 8 },
    { name: 'OPS/text/two.html', content: '<html><body><p>Nội dung phần hai đủ để đọc.</p></body></html>', method: 0 },
    { name: 'OPS/outline.xhtml', content: '<html><body><h1>Document Outline</h1><p>Notes</p></body></html>', method: 8 }
]);
const base64 = archive.toString('base64');
const chapters = epubChapterList(base64);
assert.deepStrictEqual(chapters, [
    { path: 'OPS/text/one.xhtml', name: 'Chương Một' },
    { path: 'OPS/text/two.html', name: 'Phần 2' }
]);

const first = epubChapterContent(base64, chapters[0].path);
assert.strictEqual(first.title, 'Chương Một');
assert.ok(first.html.includes('Tiếng Việt: Trời xanh.'));
assert.ok(!/<(?:script|img|a)\b|\s(?:style|onclick|href|id)=/i.test(first.html));
assert.strictEqual(epubChapterContent(base64, chapters[1].path).title, 'Phần 2');
assert.throws(function () { epubChapterContent(base64, 'OPS/outline.xhtml'); }, /Phần EPUB không (?:hợp lệ|có văn bản)/);
assert.throws(function () { epubChapterList('not base64'); }, /base64/);

const corrupt = Buffer.from(archive);
const corruptAt = corrupt.indexOf(Buffer.from('Nội dung phần hai'));
assert.ok(corruptAt >= 0);
corrupt[corruptAt] ^= 1;
assert.throws(function () { epubChapterList(corrupt.toString('base64')); }, /CRC/);

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
assert.strictEqual(manifest.metadata.type, 'novel');
['search', 'detail', 'toc', 'chap'].forEach(function (name) {
    assert.ok(manifest.script[name]);
    assert.ok(fs.existsSync(path.join(src, manifest.script[name])));
});

const searchHtml = '<html><body><p>Có 1 kết quả</p>' +
    '<a class="woocommerce-LoopProduct-link" href="/sach-thu-123.html"><img src="/cover.jpg" alt="Sách thử"></a>' +
    '<a class="woocommerce-LoopProduct-link" href="/sach-thu-123.html">Sách thử</a></body></html>';
const detailHtml = '<html><head><meta property="og:title" content="Sách thử">' +
    '<meta property="og:image" content="/cover.jpg"><meta property="og:description" content="Mô tả sách"></head>' +
    '<body><main class="primary"><h1>Sách thử</h1><p>Tác giả: Tác giả thử Số trang: 100 Định dạng: EPUB Tình trạng: Hoàn thành</p>' +
    '<a href="/download/epub/test123">EPUB</a></main></body></html>';
const cache = {};
let epubFetches = 0;
global.cacheStorage = {
    getItem(key) { return cache[key] || ''; },
    setItem(key, value) { cache[key] = value; }
};
global.Response = {
    success(data, data2) { return { ok: true, data, data2 }; },
    error(error) { return { ok: false, error }; }
};
global.Log = {
    log() {}
};
global.fetch = function (url) {
    let html = '';
    if (url.includes('/search.php?')) html = searchHtml;
    else if (url.endsWith('/sach-thu-123.html')) html = detailHtml;
    else if (url.endsWith('/download/epub/test123')) epubFetches++;
    else return { ok: false, status: 404 };
    return {
        ok: true,
        status: 200,
        text() { return html; },
        html() { return Html.parse(html); },
        base64() { return base64; }
    };
};
function run(name) {
    load(name);
    return global.execute;
}

let result = run('home.js')();
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data, [
    { title: 'Sách điện tử', input: '', script: 'search.js' }
]);

result = run(result.data[0].script)(result.data[0].input, '1');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 1);
assert.strictEqual(result.data[0].name, 'Sách thử');

result = run('search.js')('sách thử', '1');
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data[0], {
    name: 'Sách thử',
    link: 'https://dilib.vn/sach-thu-123.html',
    cover: 'https://dilib.vn/cover.jpg',
    description: '',
    host: 'https://dilib.vn'
});
assert.strictEqual(result.data2, '');

result = run('detail.js')('https://dilib.vn/sach-thu-123.html');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.type, 'novel');
assert.strictEqual(result.data.format, 'novel');
assert.strictEqual(result.data.author, 'Tác giả thử');

result = run('toc.js')('https://dilib.vn/sach-thu-123.html');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 2);
assert.ok(result.data[0].url.includes('#entry=OPS%2Ftext%2Fone.xhtml'));
assert.strictEqual(epubFetches, 1);

result = run('chap.js')(result.data[0].url);
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data2, 'Chương Một');
assert.ok(result.data.includes('Tiếng Việt: Trời xanh.'));
assert.strictEqual(epubFetches, 1);
assert.strictEqual(run('chap.js')('https://evil.example/file.epub#entry=x').ok, false);

const sample = path.join(os.tmpdir(), 'dilib-451.epub');
if (fs.existsSync(sample)) {
    const live = epubChapterList(fs.readFileSync(sample).toString('base64'));
    assert.strictEqual(live.length, 2);
    assert.ok(epubChapterContent(fs.readFileSync(sample).toString('base64'), live[0].path).html.length > 100000);
    console.log('dilib-ebook self-check: extension chain + downloaded Dilib EPUB passed');
} else {
    console.log('dilib-ebook self-check: extension chain passed');
}
