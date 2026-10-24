function aiLines(value) {
    var result = [], seen = {};
    String(value || "").split(/\r?\n/).forEach(function (line) {
        line = line.trim();
        if (line && !seen[line]) { seen[line] = true; result.push(line); }
    });
    return result;
}

function aiPresets() {
    var presets;
    try { presets = JSON.parse(String(PROMPT_PRESETS || "{}")); }
    catch (e) { throw new Error("Prompt presets must be a JSON object of name: instruction pairs."); }
    if (!presets || Array.isArray(presets) || typeof presets !== "object") throw new Error("Prompt presets must be a JSON object.");
    var names = Object.keys(presets);
    if (names.length > 50) throw new Error("Use at most 50 prompt presets.");
    names.forEach(function (name) {
        if (!name.trim() || typeof presets[name] !== "string" || !presets[name].trim() || presets[name].length > 16000) throw new Error("Each preset needs a name and 1–16000 characters of instructions.");
    });
    return presets;
}

function aiChunks(text, size) {
    var result = [];
    while (text.length > size) {
        var end = text.lastIndexOf("\n", size - 1) + 1;
        if (end < size / 2) end = size;
        var code = text.charCodeAt(end - 1);
        if (code >= 0xD800 && code <= 0xDBFF) end--;
        if (text.charAt(end - 1) === "\r" && text.charAt(end) === "\n") end--;
        result.push(text.substring(0, end));
        text = text.substring(end);
    }
    if (text) result.push(text);
    return result;
}

function aiSend(text, prompt, models, keys, config) {
    var result;
    var attempts = 0;
    for (var m = 0; m < models.length; m++) {
        for (var k = 0; k < keys.length; k++) {
            if (++attempts > 6) return aiFailure("Request attempt limit reached (6 per chunk).");
            result = aiRequest(text, prompt, models[m], keys[k], config);
            if (result.code === 0) return result;
            if (!result.status) return result;
            if (KEY_FAILOVER !== "true" || [401, 403, 429].indexOf(result.status) < 0) break;
        }
        if (MODEL_FAILOVER !== "true" || [404, 429, 500, 502, 503].indexOf(result.status) < 0) return result;
    }
    return result;
}
