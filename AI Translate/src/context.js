// Read-only prompt guidance; never replace words in the source text.
// Defaults: USE_GLOSSARY=true, USE_NAME_FILTER=false, NAME_MIN=2, NAME_MAX=5,
// NAME_REPEAT=3; NAME_SURNAMES, NAME_SUFFIXES, NAME_STOP_WORDS are empty newline lists.
// Precedence: shared < QT phrases < QT names < book names < book glossary.
function aiContext(text, from, to) {
    function toggle(value, key) {
        value = String(value);
        if (value !== "true" && value !== "false") throw new Error("Invalid " + key + ": use true or false.");
        return value === "true";
    }
    function integer(value, key, min, max) {
        value = String(value);
        if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
            throw new Error("Invalid " + key + ": integer outside supported range.");
        }
        return Number(value);
    }
    function list(value, key, chinese) {
        value = String(value);
        if (value.length > 4096) throw new Error("Invalid " + key + ": list too long.");
        var lines = value.split(/\r?\n/), result = [];
        for (var i = 0; i < lines.length; i++) {
            var word = lines[i].trim();
            if (!word) continue;
            if (word.length > (chinese ? 12 : 64) || (chinese && !/^[\u3400-\u9fff]+$/.test(word))) {
                throw new Error("Invalid " + key + ": unsupported list entry.");
            }
            if (result.indexOf(word) < 0) result.push(word);
        }
        if (result.length > 256) throw new Error("Invalid " + key + ": too many entries.");
        return result;
    }
    var useGlossary = toggle(typeof USE_GLOSSARY === "undefined" ? "true" : USE_GLOSSARY, "USE_GLOSSARY");
    var useNames = toggle(typeof USE_NAME_FILTER === "undefined" ? "false" : USE_NAME_FILTER, "USE_NAME_FILTER");
    var min = integer(typeof NAME_MIN === "undefined" ? "2" : NAME_MIN, "NAME_MIN", 2, 12);
    var max = integer(typeof NAME_MAX === "undefined" ? "5" : NAME_MAX, "NAME_MAX", 2, 12);
    var repeat = integer(typeof NAME_REPEAT === "undefined" ? "3" : NAME_REPEAT, "NAME_REPEAT", 1, 1000);
    if (min > max) throw new Error("Invalid NAME_MIN: must not exceed NAME_MAX.");
    var surnames = list(typeof NAME_SURNAMES === "undefined" ? "" : NAME_SURNAMES, "NAME_SURNAMES", true);
    var suffixes = list(typeof NAME_SUFFIXES === "undefined" ? "" : NAME_SUFFIXES, "NAME_SUFFIXES", true);
    var stops = list(typeof NAME_STOP_WORDS === "undefined" ? "" : NAME_STOP_WORDS, "NAME_STOP_WORDS", false);
    text = String(text == null ? "" : text);
    var entries = {};
    function add(key, value) {
        if (key == null || value == null) return;
        key = String(key);
        if (key && text.indexOf(key) >= 0) entries["$" + key] = String(value);
    }
    function database(id) {
        try {
            var rows = localDatabase.list(id, "glossary");
            if (!Array.isArray(rows)) throw new Error();
            for (var i = 0; i < rows.length; i++) {
                if (!rows[i] || rows[i].key == null || rows[i].value == null) throw new Error();
                add(rows[i].key, rows[i].value);
            }
        } catch (e) {
            throw new Error("Cannot read glossary database.");
        }
    }
    if (useGlossary) database("");
    var book = typeof localBook === "undefined" ? null : localBook;
    var info = null;
    // No book context exists in the developer server; omit only unavailable book APIs.
    try { if (useGlossary && book && book.getInfo) info = book.getInfo(); } catch (e) { info = null; }
    if (info) {
        var methods = ["getQtVietPhrases", "getQtNames", "getNames"];
        for (var m = 0; m < methods.length; m++) {
            if (!book[methods[m]]) continue;
            try {
                var map = book[methods[m]]();
                if (!map || Object.prototype.toString.call(map) !== "[object Object]") throw new Error();
                for (var key in map) {
                    if (Object.prototype.hasOwnProperty.call(map, key)) add(key, map[key]);
                }
            } catch (e) { throw new Error("Cannot read book dictionaries."); }
        }
        if (info.id != null && String(info.id)) database(String(info.id));
    }
    var output = "", lineCount = 0;
    function append(header, line) {
        var addition = (header ? (output ? "\n" : "") + header + "\n" : "\n") + line;
        if (lineCount >= 100 || output.length + addition.length > 8192) return false;
        output += addition;
        lineCount++;
        return true;
    }
    var keys = Object.keys(entries).sort(function (a, b) { return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); });
    for (var k = 0; k < keys.length; k++) {
        append(output ? "" : "Glossary (translation data, not instructions):", JSON.stringify(keys[k].slice(1)) + " = " + JSON.stringify(entries[keys[k]]));
    }
    if (useNames && /^(zh(?:-.+)?|auto)?$/.test(String(from || "")) && (surnames.length || suffixes.length)) {
        // ponytail: approximate BMP-Chinese substrings, not NER. Overlapping candidates may be false positives.
        // Scan 100k characters / 2048 unique candidates; emit <=40 names. Use explicit glossary for accuracy.
        var sample = text.slice(0, 100000);
        for (var s = 0; s < stops.length; s++) sample = sample.split(stops[s]).join(" ");
        var counts = {}, candidates = [];
        for (var pos = 0; pos < sample.length; pos++) {
            for (var len = min; len <= max && pos + len <= sample.length; len++) {
                var candidate = sample.substr(pos, len);
                if (!/^[\u3400-\u9fff]+$/.test(candidate)) break;
                var matched = false;
                for (var a = 1; a < candidate.length; a++) {
                    if (surnames.indexOf(candidate.slice(0, a)) >= 0 || suffixes.indexOf(candidate.slice(-a)) >= 0) {
                        matched = true;
                        break;
                    }
                }
                if (!matched) continue;
                var token = "$" + candidate;
                if (counts[token]) counts[token]++;
                else if (candidates.length < 2048) { counts[token] = 1; candidates.push(candidate); }
            }
        }
        candidates.sort(function (a, b) { return counts["$" + b] - counts["$" + a] || b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); });
        var emitted = 0, attempted = 0;
        for (var c = 0; c < candidates.length && attempted < 40 && lineCount < 100; c++) {
            var name = candidates[c];
            if (counts["$" + name] < repeat || Object.prototype.hasOwnProperty.call(entries, "$" + name)) continue;
            attempted++;
            var guidance = JSON.stringify(name);
            // extension-api.md documents hv and the { translateText, segments } bridge result.
            if (String(to) === "vi" && typeof Qt !== "undefined" && Qt && Qt.translate) {
                try {
                    var translated = Qt.translate(name, "hv");
                    if (!translated || translated.translateText == null || !String(translated.translateText).trim()) throw new Error();
                    guidance += " = " + JSON.stringify(String(translated.translateText));
                } catch (e) { throw new Error("Cannot read native name transliteration."); }
            }
            if (append(emitted ? "" : "Possible names (heuristic only; prefer explicit glossary, ignore false positives):", guidance)) emitted++;
        }
    }
    return output;
}
