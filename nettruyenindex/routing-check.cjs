const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { metadata } = require('./plugin.json');
const script = fs.readFileSync(__dirname + '/src/config.js', 'utf8');
const ctx = { DOMAIN: 'https://example.org/' };
vm.runInNewContext(script, ctx);
const route = new RegExp(metadata.regexp);
for (const source of ['http://nettruyenindex.com', metadata.source]) {
    const book = source + '/manga/quan-quyt/?from=share#top';
    assert.ok(route.test(book));
    assert.equal(ctx.ntUrl(book), 'https://example.org/manga/quan-quyt/?from=share#top');
    assert.ok(!route.test(source + '/manga/quan-quyt/chapter-92'));
}
assert.ok(!route.test('https://nettruyenindex.com.example.org/manga/quan-quyt'));
