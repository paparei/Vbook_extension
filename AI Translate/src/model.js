load('options.js');

function execute() {
    var models = aiLines(String(MODEL) + "\n" + String(MODEL_LIST));
    if (models.length > 11) return Response.error("Use at most 10 additional models.");
    return Response.success(models.map(function (id) {
        return { id: id, name: id, isNetworkRequired: true };
    }));
}
