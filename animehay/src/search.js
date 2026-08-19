load('config.js');

// search.js — AnimeHay no longer supports search functionality.
// We return an empty success list to avoid errors in the app shelf.
function execute(key, page) {
    return Response.success([]);
}
