"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync(__dirname + "/src/translate.js", "utf8");
let settings = {
  api_url: "https://ai.lts.asia/v1",
  api_key: "router-key",
  model: "qwen/test",
  temperature: "0.2",
  timeout: "60000",
  max_length: "20000",
  glossary: "张三 = Trương Tam",
  system_prompt: "Keep recurring names consistent."
};
let request;
let nextResponse = {
  status: 200,
  statusText: "OK",
  ok: true,
  json: () => ({ choices: [{ message: { content: "  Xin chào\n" } }] })
};

const context = {
  localConfig: { getItem: (name) => settings[name] },
  fetch: (url, options) => {
    request = { url, options };
    return nextResponse;
  },
  Response: {
    success: (data) => ({ code: 0, data }),
    error: (message) => ({ code: 1, data: message })
  },
  console
};
vm.runInNewContext(source + "\nthis.runTranslate = execute;", context);

let result = context.runTranslate("第一章\n占位符 {name}", "zh-CN", "vi", "chapterContent");
assert.deepStrictEqual(result, { code: 0, data: "  Xin chào\n" });
assert.strictEqual(request.url, "https://ai.lts.asia/v1/chat/completions");
assert.strictEqual(request.options.headers.Authorization, "Bearer router-key");
const body = JSON.parse(request.options.body);
assert.strictEqual(body.model, "qwen/test");
assert.strictEqual(body.messages[1].content, "第一章\n占位符 {name}");
assert.match(body.messages[0].content, /chapter body/);
assert.match(body.messages[0].content, /张三 = Trương Tam/);
assert.match(body.messages[0].content, /Keep recurring names consistent/);

settings.api_url = "https://ai.lts.asia/v1/chat/completions";
settings.api_key = "";
result = context.runTranslate("hello", "en", "vi", "detail");
assert.strictEqual(result.code, 1);
assert.match(result.data, /9router API key/);

settings.api_key = "router-key";
nextResponse = {
  status: 401,
  statusText: "Unauthorized",
  ok: false,
  json: () => ({ error: { message: "invalid router key" } })
};
result = context.runTranslate("hello", "en", "vi", "");
assert.strictEqual(result.code, 1);
assert.match(result.data, /invalid router key/);

console.log("openai-translate self-check passed");
