const UPSTREAM_HEADERS = {
  Origin: "https://anime47.best",
  Referer: "https://anime47.best/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36",
};

function allowed(url) {
  return url.protocol === "https:" && (
    url.hostname === "pl.vlogphim.net" || /^cdn\d+\.nonprofit\.asia$/.test(url.hostname)
  );
}

async function upstream(url) {
  for (let redirects = 0; redirects < 4; redirects++) {
    if (!allowed(url)) throw new Error("Upstream is not allowed");
    const response = await fetch(url, {
      headers: UPSTREAM_HEADERS,
      redirect: "manual",
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("Location");
    if (!location) return response;
    url = new URL(location, url);
  }
  throw new Error("Too many redirects");
}

function proxyUrl(target, requestUrl) {
  const source = new URL(target);
  const url = new URL(requestUrl);
  url.pathname = /^cdn\d+\.nonprofit\.asia$/.test(source.hostname) ? "/segment.ts" : "/playlist.m3u8";
  url.searchParams.set("url", source.href);
  return url.href;
}

function mediaUrl(value, base) {
  const url = new URL(value, base);
  if (url.hostname === "pl.vlogphim.net" && url.pathname.startsWith("/m3u8/") && !url.pathname.endsWith(".m3u8")) {
    url.pathname += ".m3u8";
  }
  return url.href;
}

function rewritePlaylist(text, sourceUrl, requestUrl) {
  return text.split(/\r?\n/).map((line) => {
    if (!line) return line;
    if (line[0] !== "#") return proxyUrl(mediaUrl(line, sourceUrl), requestUrl);
    return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${proxyUrl(mediaUrl(uri, sourceUrl), requestUrl)}"`);
  }).join("\n");
}

function stripPng(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 8 || signature.some((byte, i) => bytes[i] !== byte)) return bytes;

  let offset = 8;
  while (bytes.length >= offset + 12) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    if (length > 2 * 1024 * 1024) throw new Error("PNG wrapper is too large");
    const end = offset + length + 12;
    if (bytes.length < end) break;
    const isEnd = bytes[offset + 4] === 73 && bytes[offset + 5] === 69 && bytes[offset + 6] === 78 && bytes[offset + 7] === 68;
    offset = end;
    if (isEnd) return bytes.subarray(offset);
  }
  throw new Error("Incomplete PNG wrapper");
}

function responseHeaders(source, type) {
  const headers = new Headers(source);
  for (const name of ["Content-Encoding", "Content-Length", "Content-Range", "ETag"]) headers.delete(name);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Type", type);
  return headers;
}

function transientStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function cdnCandidate(target, attempt) {
  const url = new URL(target);
  const current = Number(url.hostname.match(/^cdn(\d+)\./)[1]);
  url.hostname = `cdn${((current - 1 + attempt) % 7) + 1}.nonprofit.asia`;
  return url;
}

function proxyLog(event, stage, url, attempt, detail) {
  const data = { event, stage, host: url.hostname, attempt: attempt + 1 };
  if (typeof detail === "number") data.status = detail;
  else data.error = detail && detail.name ? detail.name : "Error";
  console[event === "anime47_proxy_failure" ? "error" : "warn"](JSON.stringify(data));
}

async function segmentResponse(target) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = cdnCandidate(target, attempt);
    let stage = "upstream-fetch";
    try {
      const source = await upstream(url);
      if (!source.ok) {
        if (transientStatus(source.status) && attempt < 2) {
          proxyLog("anime47_proxy_retry", "upstream-status", url, attempt, source.status);
          if (source.body) await source.body.cancel();
          continue;
        }
        proxyLog("anime47_proxy_failure", "upstream-status", url, attempt, source.status);
        return new Response(source.body, {
          status: source.status,
          headers: responseHeaders(source.headers, source.headers.get("Content-Type") || "application/octet-stream"),
        });
      }

      stage = "segment-body";
      const body = new Uint8Array(await source.arrayBuffer());
      stage = "segment-unwrap";
      const bytes = stripPng(body);
      return new Response(bytes, {
        status: source.status,
        headers: responseHeaders(source.headers, "video/mp2t"),
      });
    } catch (error) {
      const retryable = stage !== "segment-unwrap" || error.message === "Incomplete PNG wrapper";
      if (retryable && attempt < 2) {
        proxyLog("anime47_proxy_retry", stage, url, attempt, error);
        continue;
      }
      proxyLog("anime47_proxy_failure", stage, url, attempt, error);
      return new Response("Upstream failed at " + stage, { status: 502, headers: { "Access-Control-Allow-Origin": "*" } });
    }
  }
}

export { stripPng };

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS" } });
    }
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });

    const input = new URL(request.url);
    if (env.PROXY_KEY && input.searchParams.get("key") !== env.PROXY_KEY) return new Response("Forbidden", { status: 403 });

    let target;
    try {
      target = new URL(input.searchParams.get("url") || "");
      if (!allowed(target)) throw new Error();
    } catch (_) {
      return new Response("Invalid upstream URL", { status: 400 });
    }

    if (request.method === "GET" && /^cdn\d+\.nonprofit\.asia$/.test(target.hostname)) return segmentResponse(target);

    let stage = "upstream-fetch";
    try {
      const source = await upstream(target);
      if (!source.ok || request.method === "HEAD") {
        if (!source.ok) console.error(JSON.stringify({ event: "anime47_proxy_failure", stage: "upstream-status", host: target.hostname, status: source.status }));
        return new Response(request.method === "HEAD" ? null : source.body, {
          status: source.status,
          headers: responseHeaders(source.headers, source.headers.get("Content-Type") || "application/octet-stream"),
        });
      }

      const type = source.headers.get("Content-Type") || "";
      if (/mpegurl/i.test(type) || target.hostname === "pl.vlogphim.net") {
        stage = "playlist-body";
        const text = await source.text();
        if (text.includes("#EXTM3U")) {
          return new Response(rewritePlaylist(text, target, request.url), {
            status: source.status,
            headers: responseHeaders(source.headers, "application/vnd.apple.mpegurl"),
          });
        }
      }

      // Native buffering avoids spending the 10 ms free-plan CPU budget on a
      // JavaScript transform callback for every streamed network chunk.
      stage = "segment-body";
      const body = new Uint8Array(await source.arrayBuffer());
      stage = "segment-unwrap";
      const bytes = stripPng(body);
      return new Response(bytes, {
        status: source.status,
        headers: responseHeaders(source.headers, "video/mp2t"),
      });
    } catch (error) {
      console.error(JSON.stringify({ event: "anime47_proxy_failure", stage, host: target.hostname, error: error && error.name ? error.name : "Error" }));
      return new Response("Upstream failed at " + stage, { status: 502, headers: { "Access-Control-Allow-Origin": "*" } });
    }
  },
};
