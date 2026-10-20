const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const embed = 'https://megaplay.buzz/stream/s-2/694507/sub?autostart=true';
const referer = 'https://animepahe.ch/bleach-thousand-year-blood-war-the-calamity-episode-1-english-subbed/';
const stream = 'https://cdn.example/video.m3u8';
const caption = { file: 'https://cdn.example/english.vtt', label: 'English', kind: 'captions' };
let payload;
let playerId = '178189';
let status = 200;
let browserStream = stream;
let closed = 0;
const context = vm.createContext({
    load() {},
    UserAgent: { chrome: () => 'test-agent' },
    Engine: { newBrowser: () => ({
        setUserAgent() {},
        launch(url) { assert.equal(url, 'https://animepahe.ch/'); },
        callJs(code) {
            if (code.indexOf('location.href=') === 0) assert.ok(code.includes(JSON.stringify(embed)));
            return { text: () => JSON.stringify(browserStream) };
        },
        html() {},
        close() { closed++; }
    }) },
    Response: { success: data => ({ code: 0, data }), error: data => ({ code: 1, data }) },
    fetch(url, options) {
        if (url === embed) {
            return { ok: true, html: () => ({ select: selector => {
                assert.equal(selector, '#megaplay-player');
                return { attr: name => { assert.equal(name, 'data-id'); return playerId; } };
            } }) };
        }
        assert.equal(url, 'https://megaplay.buzz/stream/getSourcesNew?id=178189');
        assert.equal(options.headers.Referer, 'https://megaplay.buzz/');
        return { ok: status === 200, status, text: () => {
            assert.equal(status, 200, 'Do not read HTTP error bodies');
            return payload;
        } };
    }
});
for (const name of ['config.js', 'track.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'src', name), 'utf8'), context);
}
function resolve(data) {
    payload = JSON.stringify(data);
    return context.execute(JSON.stringify({ embed, referer }));
}
const encrypted = resolve({ enc: 'opaque-encrypted-value', tracks: [caption, { file: 'preview.vtt', kind: 'thumbnails' }] });
assert.equal(encrypted.code, 0);
assert.equal(encrypted.data.type, 'native');
assert.equal(encrypted.data.data, stream);
assert.equal(encrypted.data.headers.Referer, 'https://megaplay.buzz/');
assert.equal(closed, 1);
assert.equal(encrypted.data.subtitles.length, 1);
assert.equal(encrypted.data.subtitles[0].data, caption.file);
browserStream = '';
assert.equal(resolve({ enc: 'value' }).code, 1, 'Do not return an unplayable auto result');
assert.equal(closed, 2);
browserStream = stream;
for (const sources of [{ file: stream }, [{ file: stream }], stream]) {
    const result = resolve({ sources, tracks: [caption] });
    assert.equal(result.code, 0);
    assert.equal(result.data.type, 'native');
    assert.equal(result.data.data, stream);
    assert.equal(result.data.headers.Referer, 'https://megaplay.buzz/');
    assert.equal(result.data.subtitles[0].data, caption.file);
}
for (const data of [null, {}, { sources: [] }, { sources: [null] }, { sources: { file: 'javascript:bad' } }]) {
    assert.equal(resolve(data).code, 1);
}
payload = 'not json';
assert.equal(context.execute(JSON.stringify({ embed, referer })).code, 1);
playerId = '';
assert.equal(resolve({ enc: 'value' }).code, 1);
playerId = '178189';
status = 503;
assert.equal(resolve({ enc: 'value' }).code, 1);
for (const input of ['null', '{}', 'not json', JSON.stringify({ embed: 'javascript:bad', referer })]) {
    assert.equal(context.execute(input).code, 1);
}
const direct = context.execute(JSON.stringify({ embed: stream, referer }));
assert.equal(direct.data.type, 'native');
assert.equal(direct.data.headers.Referer, referer);
console.log('PASS: MegaPlay referer-aware browser resolution, cleanup, subtitles, native sources and errors.');
