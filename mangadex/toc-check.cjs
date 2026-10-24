const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const config = fs.readFileSync(path.join(__dirname, 'src/config.js'), 'utf8');
const toc = fs.readFileSync(path.join(__dirname, 'src/toc.js'), 'utf8');

function chapter(id, lang, num, extra) {
    return Object.assign({
        id: id,
        attributes: { chapter: num, translatedLanguage: lang, volume: null, title: null, externalUrl: null },
        relationships: []
    }, extra || {});
}

function run(chapters, configValue) {
    const calls = [];
    const context = vm.createContext({
        Date: Date,
        console: { log() {} },
        cacheStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        localStorage: { getItem: () => '1', setItem() {}, clear() {} },
        sleep: () => {},
        Response: {
            success: (data) => ({ ok: true, data: data }),
            error: (msg) => ({ ok: false, message: msg })
        },
        fetch: (url) => {
            calls.push(url);
            return {
                status: 200, ok: true, url: url,
                header: () => '',
                text: () => JSON.stringify({ result: 'ok', total: chapters.length, data: chapters })
            };
        }
    });
    if (configValue !== undefined) context.md_languages = configValue;
    context.load = () => {};
    vm.runInContext(config + '\n' + toc, context);
    return { result: context.execute('https://mangadex.org/title/510f29a8-99b4-46af-ba5e-916e96bc6f37'), calls };
}

const ids = (res) => Array.from(res.data).map((c) => c.url.split('/').pop());

// Chapter in both languages: only the priority language; gaps fall back to en; sorted by number.
let r = run([chapter('a', 'vi', '1'), chapter('b', 'en', '1'), chapter('d', 'en', '2'), chapter('c', 'vi', '3'), chapter('e', 'en', '3')], 'vi,en');
assert.equal(r.result.ok, true);
assert.deepEqual(ids(r.result), ['a', 'd', 'c'], 'one entry per chapter, vi preferred, en fills ch.2');
assert.match(r.result.data[0].name, /^\[VI\]/);
assert.match(r.result.data[1].name, /^\[EN\]/);

// Priority flips the winner; numeric (not string) chapter order.
r = run([chapter('a', 'vi', '10'), chapter('b', 'en', '10'), chapter('c', 'vi', '9.5')], 'en,vi');
assert.deepEqual(ids(r.result), ['c', 'b']);

// Two groups translating the same chapter in the winning language both stay.
r = run([chapter('a', 'vi', '1'), chapter('b', 'vi', '1'), chapter('c', 'en', '1')], 'vi,en');
assert.deepEqual(ids(r.result), ['a', 'b']);

// Oneshots (no chapter number) are never merged with each other.
r = run([chapter('a', 'vi', null), chapter('b', 'en', null)], 'vi,en');
assert.deepEqual(ids(r.result), ['a', 'b']);

// Single configured language keeps the plain label and stays filtered.
r = run([chapter('a', 'vi', '1'), chapter('b', 'en', '1')], 'vi');
assert.deepEqual(ids(r.result), ['a']);
assert.doesNotMatch(r.result.data[0].name, /^\[/);

// Unconfigured languages are still excluded.
r = run([chapter('a', 'vi', '1'), chapter('b', 'fr', '1'), chapter('c', 'en', '2')], 'en,vi');
assert.deepEqual(ids(r.result), ['a', 'c'], 'fr dropped');

// External chapters are skipped; empty language set errors via configured-language message.
r = run([chapter('a', 'vi', '1', { attributes: { chapter: '1', translatedLanguage: 'vi', externalUrl: 'https://x' } })], 'vi');
assert.equal(r.result.ok, false);
assert.match(r.result.message, /ngôn ngữ/);

// Chapter label composition survives the merge.
r = run([chapter('a', 'en', '5', {
    attributes: { chapter: '5', volume: '2', translatedLanguage: 'en', title: 'Prologue', externalUrl: null },
    relationships: [{ type: 'scanlation_group', attributes: { name: 'GroupX' } }]
})], 'en');
assert.equal(r.result.data[0].name, 'Vol. 2 Ch. 5 - Prologue [GroupX]');

console.log('PASS: toc merges every configured language in priority order, filters the rest, keeps labels.');
