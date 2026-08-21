const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'src');
const mangaId = '11111111-1111-4111-8111-111111111111';
const tagId = '22222222-2222-4222-8222-222222222222';
const chapterId = '33333333-3333-4333-8333-333333333333';
let requests = [];
let failStatus = 0;

const tag = { id: tagId, attributes: { name: { vi: 'Hành động', en: 'Action' } } };
const manga = {
    id: mangaId,
    attributes: {
        title: { vi: 'Truyện mẫu', en: 'Mock Manga' },
        description: { vi: '<b>Mô tả</b> & thử nghiệm' },
        status: 'ongoing',
        contentRating: 'suggestive',
        year: 2026,
        tags: [tag]
    },
    relationships: [
        { type: 'cover_art', attributes: { fileName: 'cover name.jpg' } },
        { type: 'author', attributes: { name: 'Tác giả' } },
        { type: 'artist', attributes: { name: 'Họa sĩ' } }
    ]
};

function jsonResponse(data, status) {
    status = status || 200;
    return {
        ok: status >= 200 && status < 300,
        status,
        text: function () { return JSON.stringify(data); },
        json: function () { return data; }
    };
}

global.md_languages = 'vi,en';
global.Response = {
    success: function (data, next) { return { ok: true, data, next }; },
    error: function (error) { return { ok: false, error }; }
};
global.fetch = function (url, options) {
    requests.push({ url, options });
    if (failStatus) {
        const status = failStatus;
        failStatus = 0;
        return jsonResponse({ result: 'error' }, status);
    }

    const parsed = new URL(url);
    if (parsed.pathname === '/manga/tag') return jsonResponse({ result: 'ok', data: [tag] });
    if (parsed.pathname === '/manga/' + mangaId) return jsonResponse({ result: 'ok', data: manga });
    if (parsed.pathname === '/manga/' + mangaId + '/feed') {
        return jsonResponse({
            result: 'ok', offset: 0, limit: 100, total: 2,
            data: [
                {
                    id: chapterId,
                    attributes: { translatedLanguage: 'vi', volume: '1', chapter: '2', title: 'Bắt đầu' },
                    relationships: [{ type: 'scanlation_group', attributes: { name: 'Nhóm dịch' } }]
                },
                {
                    id: '44444444-4444-4444-8444-444444444444',
                    attributes: { translatedLanguage: 'en', chapter: '2', title: 'Start' },
                    relationships: []
                }
            ]
        });
    }
    if (parsed.pathname === '/at-home/server/' + chapterId) {
        return jsonResponse({
            result: 'ok',
            baseUrl: 'https://uploads.example',
            chapter: { hash: 'hash', data: ['001 first.jpg', '002.jpg'], dataSaver: [] }
        });
    }
    if (parsed.pathname === '/manga') {
        return jsonResponse({ result: 'ok', offset: 0, limit: 24, total: 25, data: [manga] });
    }
    return jsonResponse({ result: 'error' }, 404);
};
global.load = function (name) {
    (0, eval)(fs.readFileSync(path.join(src, name), 'utf8'));
};

function run(name) {
    load(name);
    return global.execute;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
assert.strictEqual(manifest.metadata.version, 3);
['home', 'genre', 'gen', 'detail', 'search', 'toc', 'chap'].forEach(function (name) {
    assert.ok(manifest.script[name], 'missing script: ' + name);
    assert.ok(fs.existsSync(path.join(src, manifest.script[name])), 'missing file: ' + manifest.script[name]);
});

let result = run('home.js')();
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 4);

requests = [];
result = run('gen.js')('latest', '0');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.next, '24');
assert.strictEqual(result.data[0].name, 'Truyện mẫu');
assert.strictEqual(result.data[0].cover, 'https://uploads.mangadex.org/covers/' + mangaId + '/cover%20name.jpg.256.jpg');
let query = new URL(requests[0].url).searchParams;
assert.deepStrictEqual(query.getAll('contentRating[]'), ['safe', 'suggestive', 'erotica']);
assert.strictEqual(query.get('order[latestUploadedChapter]'), 'desc');
assert.strictEqual(query.get('status[]'), 'ongoing');

requests = [];
run('gen.js')('follows', '0');
query = new URL(requests[0].url).searchParams;
assert.strictEqual(query.get('order[followedCount]'), 'desc');
assert.strictEqual(query.get('status[]'), 'ongoing');

requests = [];
run('gen.js')('rating', '0');
assert.strictEqual(new URL(requests[0].url).searchParams.has('status[]'), false);

requests = [];
run('gen.js')('completed', '0');
assert.strictEqual(new URL(requests[0].url).searchParams.get('status[]'), 'completed');

requests = [];
result = run('search.js')('One & Only', '0');
assert.strictEqual(result.ok, true);
assert.ok(requests[0].url.indexOf('title=One%20%26%20Only') >= 0);

result = run('genre.js')();
assert.deepStrictEqual(result.data[0], { title: 'Hành động', input: tagId, script: 'gen.js' });

requests = [];
result = run('gen.js')(tagId, '0');
assert.strictEqual(new URL(requests[0].url).searchParams.get('includedTags[]'), tagId);

result = run('detail.js')('https://mangadex.org/title/' + mangaId + '/mock-title?tab=chapters');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.author, 'Tác giả • Họa sĩ');
assert.strictEqual(result.data.description, 'Mô tả & thử nghiệm');
assert.strictEqual(result.data.nsfw, true);

requests = [];
result = run('toc.js')('https://mangadex.org/title/' + mangaId + '/mock-title');
assert.strictEqual(result.ok, true);
assert.strictEqual(result.data.length, 1);
assert.strictEqual(result.data[0].name, 'Vol. 1 Ch. 2 - Bắt đầu [Nhóm dịch]');
query = new URL(requests[0].url).searchParams;
assert.deepStrictEqual(query.getAll('translatedLanguage[]'), ['vi', 'en']);

result = run('chap.js')('https://mangadex.org/chapter/' + chapterId + '?foo=bar');
assert.strictEqual(result.ok, true);
assert.deepStrictEqual(result.data, [
    'https://uploads.example/data/hash/001%20first.jpg',
    'https://uploads.example/data/hash/002.jpg'
]);

assert.strictEqual(run('detail.js')('not-a-url').ok, false);
failStatus = 429;
result = run('search.js')('rate limited', '0');
assert.strictEqual(result.ok, false);
assert.ok(result.error.indexOf('HTTP 429') >= 0);

console.log('MangaDex self-check PASS');
