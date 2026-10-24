function aiSuccess(data) { return { code: 0, data: data }; }
function aiFailure(message) { return { code: 1, data: message }; }

function aiRequest(text, prompt, chosenModel, key, config) {
    var provider = config.provider;
    var url = config.url;
    var limit = config.limit;
    var topPValue = config.topP;
    var topKValue = config.topK;
    var headers = { "Content-Type": "application/json" };
    var body;
    if (provider === "Gemini") {
        headers["x-goog-api-key"] = key;
        url += "/models/" + encodeURIComponent(chosenModel) + ":generateContent";
        body = {
            systemInstruction: { parts: [{ text: prompt }] },
            contents: [{ role: "user", parts: [{ text: String(text) }] }],
            generationConfig: { maxOutputTokens: limit }
        };
    } else if (provider === "Anthropic") {
        headers["x-api-key"] = key;
        headers["anthropic-version"] = "2023-06-01";
        if (!/\/messages$/.test(url)) url += "/messages";
        body = { model: chosenModel, system: prompt, messages: [{ role: "user", content: String(text) }], max_tokens: limit, stream: false };
    } else {
        if (key) headers.Authorization = "Bearer " + key;
        if (!/\/chat\/completions$/.test(url)) url += "/chat/completions";
        body = {
            model: chosenModel,
            messages: [{ role: provider === "OpenAI" ? "developer" : "system", content: prompt }, { role: "user", content: String(text) }],
            stream: false
        };
        var tokenParameter = String(TOKEN_PARAMETER);
        if (tokenParameter === "auto") tokenParameter = provider === "OpenAI" ? "max_completion_tokens" : "max_tokens";
        body[tokenParameter] = limit;
    }
    if (String(TEMPERATURE).trim()) {
        if (provider === "Gemini") body.generationConfig.temperature = Number(TEMPERATURE);
        else body.temperature = Number(TEMPERATURE);
    }
    if (topPValue) {
        if (provider === "Gemini") body.generationConfig.topP = Number(topPValue);
        else body.top_p = Number(topPValue);
    }
    if (topKValue && provider === "Gemini") body.generationConfig.topK = Number(topKValue);
    var response;
    try {
        response = fetch(url, { method: "POST", headers: headers, body: JSON.stringify(body), timeout: 120000 });
    } catch (e) {
        return aiFailure("Network request failed. Check API URL and connectivity.");
    }
    if (!response || !response.ok) {
        var status = response ? Number(response.status) : 0;
        var hints = { 400: "Check model and generation settings.", 401: "Check API key.", 403: "Check API permissions.", 404: "Check API URL and Model ID.", 429: "Rate limit or quota exceeded; try later.", 504: "Request timed out or server is unreachable." };
        return { code: 1, status: status, data: "HTTP " + (status || "unavailable") + ": " + (hints[status] || "Provider request failed; try later.") };
    }
    var result;
    try { result = response.json(); } catch (e) { return aiFailure("API returned invalid JSON."); }
    var output = "";
    var parts;
    var reason;
    if (provider === "Gemini") {
        var candidate = result && result.candidates && result.candidates[0];
        reason = candidate && candidate.finishReason;
        if (reason && reason !== "STOP") return aiFailure("Gemini did not complete the translation. Check output limit or provider content restrictions.");
        parts = candidate && candidate.content && candidate.content.parts;
    } else if (provider === "Anthropic") {
        reason = result && result.stop_reason;
        if (reason && reason !== "end_turn" && reason !== "stop_sequence") return aiFailure("Anthropic did not complete the translation. Check output limit or provider content restrictions.");
        parts = result && result.content;
    } else {
        var choice = result && result.choices && result.choices[0];
        reason = choice && choice.finish_reason;
        if (reason && reason !== "stop") return aiFailure("API did not complete the translation. Check output limit or provider content restrictions.");
        if (choice && choice.message && choice.message.refusal) return aiFailure("Provider declined the translation.");
        output = choice && choice.message && choice.message.content;
        if (Array.isArray(output)) { parts = output; output = ""; }
    }
    if (Array.isArray(parts)) {
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (part && !part.thought && (!part.type || part.type === "text") && typeof part.text === "string") output += part.text;
        }
    }
    if (typeof output !== "string" || !output.trim()) return aiFailure("API returned no translation.");
    return aiSuccess(output.trim());
}
