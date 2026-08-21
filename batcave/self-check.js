const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const root = __dirname;
const src = path.join(root, 'src');
let requests = [];
let fixture = { status: 200, html: '' };

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

function htmlDocument(html) {
    const $ = cheerio.load(html);
    return wrap($.root());
}

function mockResponse() {
    const current = fixture;
    return {
        ok: current.status >= 200 && current.status < 300,
        status: current.status,
        text() { return current.html; },
        html() { return htmlDocument(current.html); }
    };
}

global.localCookie = {
    getCookie() { return 'session=abc\r\nInjected: no'; }
};
global.Response = {
    success(data, next) { return { ok: true, data, next }; },
    error(error) { return { ok: false, error }; }
};
global.fetch = function (url, options) {
    requests.push({ url, options });
    return mockResponse();
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
assert.strictEqual(manifest.metadata.version, 2);
assert.strictEqual(manifest.config, undefined);
['home', 'gen', 'detail', 'search', 'toc', 'chap'].forEach(function (name) {
    assert.ok(manifest.script[name], 'missing script: ' + name);
    assert.ok(fs.existsSync(path.join(src, manifest.script[name])), 'missing file: ' + manifest.script[name]);
});

let result = run('home.js')();
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 2);

fixture = {
    status: 200,
    html: '<a class="comic" href="/27970-the-eltingville-club-2016.html" title="The Eltingville Club (2016-)">' +
        '<img data-src="//img.batcave.biz/covers/27970.jpg" alt="cover"><span class="latest">Issue 8</span></a>' +
        '<a href="https://example.com/not-a-comic.html"><img src="bad.jpg">Bad</a>' +
        '<a rel="next" href="/page/2/">Next</a>'
};
requests = [];
result = run('gen.js')('https://batcave.biz/', '1');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.next, '2');
assert.deepStrictEqual(result.data[0], {
    name: 'The Eltingville Club (2016-)',
    link: 'https://batcave.biz/27970-the-eltingville-club-2016.html',
    cover: 'https://img.batcave.biz/covers/27970.jpg',
    description: 'Issue 8',
    host: 'https://batcave.biz'
});
assert.strictEqual(requests[0].options.headers.Cookie, 'session=abcInjected: no');

requests = [];
result = run('search.js')('Batman & Robin', '2');
assert.strictEqual(result.ok, true);
assert.ok(requests[0].url.indexOf('story=Batman%20%26%20Robin') >= 0);
assert.ok(requests[0].url.indexOf('search_start=2') >= 0);

fixture = {
    status: 200,
    html: '<meta property="og:title" content="Detective Comics (2016-) Comics Online Free | High-Quality Scans">' +
        '<meta property="og:image" content="https://img.batcave.biz/covers/1664.jpg">' +
        '<meta property="og:description" content="A detective story & more.">' +
        '<span class="writer">James Tynion IV</span><div class="comic-info">Publisher: DC</div>' +
        '<a href="/genre/superhero/">Superhero</a>'
};
result = run('detail.js')('https://batcave.biz/1664-detective-comics.html');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.name, 'Detective Comics (2016-)');
assert.strictEqual(result.data.author, 'James Tynion IV');
assert.strictEqual(result.data.description, 'A detective story & more.');
assert.strictEqual(result.data.ongoing, true);
assert.deepStrictEqual(result.data.genres[0], {
    title: 'Superhero',
    input: 'https://batcave.biz/genre/superhero/',
    script: 'gen.js'
});

fixture = {
    status: 200,
    html: '<a href="/reader/1664/100" title="Detective Comics #100">Read</a>' +
        '<option value="https:\/\/batcave.biz\/reader\/1664\/101">Detective Comics #101</option>' +
        '<script>window.issue="\\/reader\\/1664\\/102";</script>'
};
result = run('toc.js')('https://batcave.biz/1664-detective-comics.html');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 3);
assert.strictEqual(result.data[0].name, 'Detective Comics #100');
assert.strictEqual(result.data[2].url, 'https://batcave.biz/reader/1664/102');

fixture = {
    status: 200,
    html: '<img class="reader-page" data-src="https://img.batcave.biz/comic/1664/001.jpg">' +
        '<img src="https://img.batcave.biz/covers/1664.jpg">' +
        '<script>window.pages=["https:\/\/img.batcave.biz\/reader\/1664\/002.webp"];</script>'
};
result = run('chap.js')('https://batcave.biz/reader/1664/100#page-1');
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data, [
    'https://img.batcave.biz/comic/1664/001.jpg',
    'https://img.batcave.biz/reader/1664/002.webp'
]);

assert.strictEqual(run('detail.js')('https://evil.example/1664.html').ok, false);
assert.strictEqual(run('chap.js')('https://batcave.biz/not-a-reader').ok, false);

fixture = { status: 403, html: '<title>Just a moment...</title><script>window._cf_chl_opt={};</script>' };
result = run('gen.js')('https://batcave.biz/', '1');
assert.strictEqual(result.ok, false);
assert.ok(result.error.indexOf('Source page') >= 0);

console.log('BatCave self-check PASS');
