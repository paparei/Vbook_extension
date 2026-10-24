const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'src/config.js'), 'utf8');
const good = { result: 'ok', data: [] };
function run(step, cached, age = 120000, route = '/manga', browserBody) {
    let now = 1800000000000;
    let calls = 0;
    const storage = new Map();
    if (cached) storage.set('md_api:https://api.mangadex.org' + route, JSON.stringify({ time: now - age, data: good }));
    class Clock extends Date { constructor() { super(now); } }
    const context = vm.createContext({
        Date: Clock, console: { log() {} },
        cacheStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
        localStorage: { getItem: () => '1', setItem() {}, clear() {} },
        sleep: ms => { now += ms; },
        fetch: (url, options) => {
            calls++;
            if (Array.isArray(step)) {
                const current = step[calls - 1];
                assert.ok(current, 'unexpected extra request');
                return { status: current.status, ok: current.status === 200, url: current.status === 200 ? url : '', text: () => JSON.stringify(good) };
            }
            assert.ok(options.timeout > 0 && options.timeout <= 30000);
            now += step.elapsed || 0;
            if (step.error) throw Error('network');
            const status = step.status || 200;
            return { status, ok: status === 200, url: url, header: key => (step.headers || {})[key] || '', text: () => step.raw || JSON.stringify(good) };
        }
    });
    vm.runInContext(source, context);
    if (browserBody !== undefined) context.Engine = { newBrowser: () => ({
        launch: url => { assert.equal(url, 'https://api.mangadex.org' + route); },
        callJs: () => ({ text: () => browserBody }),
        close: () => { context.closed = true; }
    }) };
    return { result: context.apiRequest(route, []), calls: () => calls, context };
}
let fallback = run([{ status: 504 }, { status: 504 }, { status: 504 }], false, 0, '/manga', JSON.stringify(JSON.stringify(good)));
assert.ok(fallback.result, 'native transport failure must recover through the embedded browser');
assert.equal(fallback.calls(), 1);
assert.equal(fallback.context.closed, true);
fallback = run([{ status: 504 }, { status: 200 }], false, 0, '/manga', '<html>error</html>');
assert.equal(fallback.result.result, 'ok');
assert.equal(fallback.context.closed, true);
fallback = run({ status: 403 }, false, 0, '/manga', JSON.stringify(good));
assert.equal(fallback.result, null);
assert.equal(fallback.context.closed, undefined, 'never bypass an HTTP access denial');
fallback = run({ status: 504 }, false, 0, '/manga', JSON.stringify(good));
assert.equal(fallback.result, null);
assert.equal(fallback.context.closed, undefined, 'real server errors use backoff, not WebView');
let r = run([{ status: 504 }, { status: 200 }]);
assert.ok(r.result, 'recover from the synthetic 504 instead of failing the listing');
assert.equal(r.result.result, 'ok');
assert.equal(r.calls(), 2);
r = run({ elapsed: 20000 });
assert.equal(r.result.result, 'ok');
assert.equal(r.context.lastApiError, '');
assert.equal(r.context.apiRequest('/manga', []).result, 'ok');
assert.equal(r.calls(), 1);
r = run({ status: 504, elapsed: 30000 });
assert.equal(r.result, null);
assert.equal(r.calls(), 1);
assert.match(r.context.lastApiError, /HTTP 504 \[v7; 30000 ms; \/manga\]/);
for (const step of [{ status: 429 }, { status: 504 }, { error: true }, { raw: '<html>gateway</html>' }]) {
    r = run(step);
    assert.equal(r.result, null);
    assert.equal(r.calls(), 3);
    assert.match(r.context.lastApiError, /v7;/);
    assert.equal(run(step, true).result.result, 'ok');
}
assert.equal(run({ status: 404 }, true).result, null);
for (const status of [400, 401, 403, 404]) assert.equal(run({ status }, true).calls(), 1);
assert.equal(run({ status: 429, headers: { 'Retry-After': '60' } }).calls(), 1);
assert.equal(run({ status: 429, headers: { 'X-RateLimit-Retry-After': '1800000060' } }).calls(), 1);
r = run([{ status: 504 }, { status: 504 }, { status: 504 }]);
assert.match(r.context.lastApiError, /network error \(vBook 504\)/);
assert.equal(r.calls(), 3);
assert.equal(run({}, true, 1000).calls(), 0);
assert.equal(run({ status: 504 }, true, 86400000).result, null);
assert.equal(run({ status: 504, elapsed: 30000 }, true, 280000, '/at-home/server/id').result, null);
for (const file of fs.readdirSync(path.join(__dirname, 'src'))) {
    if (file.endsWith('.js')) new vm.Script(fs.readFileSync(path.join(__dirname, 'src', file), 'utf8'), { filename: file });
}
console.log('PASS: WebView recovery/cleanup/validation, synthetic 504 retries, rate limits, cache fallback/expiry, permanent errors, syntax.');
