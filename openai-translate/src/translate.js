function setting(name, fallback) {
    try {
        var value = localConfig.getItem(name);
        return value === null || value === undefined ? fallback : String(value);
    } catch (error) {
        return fallback;
    }
}

function numberSetting(name, fallback) {
    var value = Number(setting(name, fallback));
    return isFinite(value) ? value : fallback;
}

function trimTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
}

function completionsUrl(value) {
    var url = trimTrailingSlash(value || "https://ai.lts.asia/v1");
    if (/\/chat\/completions$/i.test(url)) return url;
    if (/\/v\d+(?:\.\d+)?$/i.test(url)) return url + "/chat/completions";
    return url + "/v1/chat/completions";
}

function languageName(language) {
    var names = {
        auto: "the detected source language",
        vi: "Vietnamese",
        en: "English",
        "zh-CN": "Simplified Chinese",
        "zh-TW": "Traditional Chinese",
        ja: "Japanese",
        ko: "Korean",
        th: "Thai",
        id: "Indonesian",
        fr: "French",
        de: "German",
        es: "Spanish",
        pt: "Portuguese",
        ru: "Russian",
        ar: "Arabic",
        it: "Italian",
        tr: "Turkish",
        hi: "Hindi"
    };
    return names[language] || language || "the target language";
}

function responseText(content) {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";

    return content.map(function (part) {
        if (typeof part === "string") return part;
        return part && (part.text || part.content || "");
    }).join("");
}

function errorMessage(response, body) {
    var detail = body && body.error && (body.error.message || body.error.code);
    if (!detail && body && body.message) detail = body.message;
    if (!detail) detail = response.statusText || "request failed";
    return "Translation API error (" + response.status + "): " + detail;
}

function contextInstruction(source) {
    var contexts = {
        chapterContent: "This is a chapter body: keep paragraphs, dialogue boundaries, narration, and sound effects intact.",
        tableOfContent: "This is a chapter or episode title: translate concisely and keep numbering intact.",
        detail: "This is metadata or a synopsis: keep names, labels, and formatting intact.",
        discovery: "This is short discovery or search text: keep it concise and preserve tags."
    };
    return contexts[source] || (source ? "Translation context: " + source + "." : "");
}

function execute(text, from, to, source) {
    text = String(text || "");
    from = from || "auto";
    to = to || "vi";
    if (!text) return Response.success("");
    var maxLength = numberSetting("max_length", 20000);
    if (maxLength > 0 && text.length > maxLength) {
        return Response.error("Text exceeds the configured " + maxLength + "-character limit.");
    }

    var sourceLanguage = languageName(from);
    var targetLanguage = languageName(to);
    var instructions = "You are a professional web-novel and manga translator. Translate faithfully from " +
        sourceLanguage + " to " + targetLanguage + ". Return only the translation, with no explanation or summary. " +
        "Preserve line breaks, whitespace, punctuation, markup, placeholders, numbers, and names. " +
        "Do not omit, merge, or add content. Keep dialogue natural while preserving the original tone, " +
        "relationships, honorifics, and character voice. Treat names and recurring terms consistently. " +
        "Never translate text inside placeholders or markup attributes.";
    var context = contextInstruction(source);
    if (context) instructions += "\n" + context;
    var glossary = setting("glossary", "").trim();
    if (glossary) instructions += "\nUse this glossary exactly and consistently:\n" + glossary;
    var extra = setting("system_prompt", "").trim();
    if (extra) instructions += "\nAdditional instructions: " + extra;

    var url = completionsUrl(setting("api_url", "https://ai.lts.asia/v1"));
    var key = setting("api_key", "").trim();
    var model = setting("model", "").trim();
    if (!key) return Response.error("Enter your 9router API key.");
    if (!model) return Response.error("Enter the model name exposed by your 9router.");
    var headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key
    };

    var response;
    try {
        response = fetch(url, {
            method: "POST",
            headers: headers,
            timeout: numberSetting("timeout", 60000),
            body: JSON.stringify({
                model: model,
                temperature: numberSetting("temperature", 0.2),
                messages: [
                    { role: "system", content: instructions },
                    { role: "user", content: text }
                ]
            })
        });
    } catch (error) {
        return Response.error("Could not reach translation API: " + String(error));
    }

    var body;
    try {
        body = response.json();
    } catch (error) {
        return Response.error("Translation API returned non-JSON response (HTTP " + response.status + ").");
    }
    if (!response.ok) return Response.error(errorMessage(response, body));

    var choice = body && body.choices && body.choices[0];
    var content = choice && choice.message ? choice.message.content : choice && choice.text;
    var result = responseText(content);
    if (!result.trim()) return Response.error("Translation API returned an empty response.");
    return Response.success(result);
}
