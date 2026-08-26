function execute() {
    return Response.success([
        { title: "Latest updates", input: "/series/?status=&type=&order=update", script: "search.js" },
        { title: "Popular", input: "/series/?status=&type=&order=popular", script: "search.js" },
        { title: "A-Z", input: "/az-list/", script: "search.js" },
        { title: "All anime", input: "/series/", script: "search.js" }
    ]);
}
