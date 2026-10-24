load('options.js');

function execute() {
    var items = [
        { id: "natural", name: "Natural", description: "Fluent wording without changing the meaning" },
        { id: "literal", name: "Literal", description: "Stay close to the original wording" },
        { id: "literary", name: "Literary / Cổ phong", description: "Preserve literary voice; Chinese to Vietnamese uses Hán Việt names and cổ phong pronouns" }
    ];
    try {
        var presets = aiPresets();
        Object.keys(presets).forEach(function (name) {
            items.push({ id: "preset:" + name, name: name, description: "Custom translation instructions" });
        });
    } catch (e) { return Response.error(e.message); }
    return Response.success(items);
}
