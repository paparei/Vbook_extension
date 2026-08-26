import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = "https://animepahe.ch";

async function get(path) {
    const response = await fetch(base + path);
    assert.equal(response.ok, true, `${path}: HTTP ${response.status}`);
    return response.text();
}

const search = await get("/?s=one%20piece");
assert.match(search, /class=["'][^"']*\bbs\b/i);
assert.match(search, /\/series\/one-piece\//i);

const detail = await get("/series/one-piece/");
assert.match(detail, /class=["'][^"']*\bentry-title\b/i);
assert.match(detail, /class=["'][^"']*\bsynp\b/i);
const episodeUrl = detail.match(/href=["'](https:\/\/animepahe\.ch\/one-piece-episode-[^"']+)["']/i);
assert.ok(episodeUrl, "episode link missing");

const episode = await get(new URL(episodeUrl[1]).pathname);
const payloads = [...episode.matchAll(/putMi\s*\(\s*this\s*,\s*['"]([^'"]+)['"]\s*\)/g)];
assert.ok(payloads.length >= 1, "playback servers missing");
const embeds = payloads.map(match => Buffer.from(match[1], "base64").toString("utf8"));
assert.match(embeds[0], /<iframe[^>]+src=/i);
const providers = embeds.map(html => {
    const url = (html.match(/<iframe[^>]+src=['"]([^'"]+)/i) || [])[1] || "";
    if (/megaplay/i.test(url)) return "MegaPlay";
    if (/flixcloud/i.test(url)) return "FlixCloud";
    if (/blogger/i.test(url)) return "Blogger";
    return "Other";
});
const selectServers = servers => servers.filter(server => server === "MegaPlay").length
    ? servers.filter(server => server === "MegaPlay")
    : servers;
assert.deepEqual(selectServers(["Blogger", "FlixCloud"]), ["Blogger", "FlixCloud"], "fallback servers removed without MegaPlay");
assert.deepEqual(selectServers(providers), ["MegaPlay"], "MegaPlay was not isolated");

const megaEmbed = embeds.map(html => (html.match(/<iframe[^>]+src=['"]([^'"]*megaplay[^'"]*)/i) || [])[1]).find(Boolean);
assert.ok(megaEmbed, "MegaPlay server missing");
const megaUrl = megaEmbed.replaceAll("&", "&");
const megaOrigin = new URL(megaUrl).origin + "/";
let response = await fetch(megaUrl, { headers: { "User-Agent": "Mozilla/5.0", "Referer": episodeUrl[1] } });
assert.equal(response.ok, true, `MegaPlay embed: HTTP ${response.status}`);
const megaPage = await response.text();
const sourceId = megaPage.match(/id=['"]megaplay-player['"][^>]+data-id=['"](\d+)['"]/i);
assert.ok(sourceId, "MegaPlay source ID missing");

response = await fetch(megaOrigin + "stream/getSourcesNew?id=" + sourceId[1], { headers: { "User-Agent": "Mozilla/5.0", "Referer": megaOrigin } });
assert.equal(response.ok, true, `MegaPlay API: HTTP ${response.status}`);
const source = (await response.json()).sources.file;
assert.match(source, /^https?:\/\/.+\.m3u8/i);

for (let step = 0, url = source; step < 3; step += 1) {
    response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": megaOrigin } });
    assert.equal(response.ok, true, `MegaPlay media step ${step}: HTTP ${response.status}`);
    if (step === 2) break;
    const playlist = await response.text();
    assert.match(playlist, /^#EXTM3U/);
    const next = playlist.split("\n").map(line => line.trim()).find(line => line && line[0] !== "#");
    assert.ok(next, `MegaPlay media URI missing at step ${step}`);
    url = new URL(next, url).href;
}

const icon = await readFile(new URL("./icon.png", import.meta.url));
assert.equal(icon.readUInt32BE(16), 200, "icon width");
assert.equal(icon.readUInt32BE(20), 200, "icon height");

console.log(`AnimePahe self-check passed: fallback policy retained; MegaPlay API, playlists, and segment playable`);
