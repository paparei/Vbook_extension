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

function append(left, right) {
  const result = new Uint8Array(left.length + right.length);
  result.set(left);
  result.set(right, left.length);
  return result;
}

function pngStripper() {
  let buffered = new Uint8Array();
  let done = false;
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  return new TransformStream({
    transform(chunk, controller) {
      if (done) {
        controller.enqueue(chunk);
        return;
      }
      buffered = append(buffered, chunk);
      if (buffered.length < 8) return;
      for (let i = 0; i < signature.length; i++) {
        if (buffered[i] !== signature[i]) {
          done = true;
          controller.enqueue(buffered);
          buffered = new Uint8Array();
          return;
        }
      }

      let offset = 8;
      while (buffered.length >= offset + 12) {
        const view = new DataView(buffered.buffer, buffered.byteOffset + offset, 4);
        const length = view.getUint32(0);
        if (length > 2 * 1024 * 1024) throw new Error("PNG wrapper is too large");
        const end = offset + length + 12;
        if (buffered.length < end) return;
        const isEnd = buffered[offset + 4] === 73 && buffered[offset + 5] === 69 && buffered[offset + 6] === 78 && buffered[offset + 7] === 68;
        offset = end;
        if (isEnd) {
          done = true;
          if (buffered.length > offset) controller.enqueue(buffered.slice(offset));
          buffered = new Uint8Array();
          return;
        }
      }
    },
    flush(controller) {
      if (!done && buffered.length) controller.enqueue(buffered);
    },
  });
}

function responseHeaders(source, type) {
  const headers = new Headers(source);
  for (const name of ["Content-Encoding", "Content-Length", "Content-Range", "ETag"]) headers.delete(name);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Type", type);
  return headers;
}

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

    try {
      const source = await upstream(target);
      if (!source.ok || request.method === "HEAD") {
        return new Response(request.method === "HEAD" ? null : source.body, {
          status: source.status,
          headers: responseHeaders(source.headers, source.headers.get("Content-Type") || "application/octet-stream"),
        });
      }

      const type = source.headers.get("Content-Type") || "";
      if (/mpegurl/i.test(type) || target.hostname === "pl.vlogphim.net") {
        const text = await source.text();
        if (text.includes("#EXTM3U")) {
          return new Response(rewritePlaylist(text, target, request.url), {
            status: source.status,
            headers: responseHeaders(source.headers, "application/vnd.apple.mpegurl"),
          });
        }
      }

      return new Response(source.body.pipeThrough(pngStripper()), {
        status: source.status,
        headers: responseHeaders(source.headers, "video/mp2t"),
      });
    } catch (error) {
      return new Response("Upstream failed: " + error.message, { status: 502, headers: { "Access-Control-Allow-Origin": "*" } });
    }
  },
};
