function execute() {
    return Response.success([
        { title: "Latest updates", input: "/latest-updates", script: "search.js" }
    ]);
}
