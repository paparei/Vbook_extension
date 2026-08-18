load('config.js');

function execute() {
    var genres = [
        { title: "Action", input: "the-loai/action" },
        { title: "Adventure", input: "the-loai/adventure" },
        { title: "Comedy", input: "the-loai/comedy" },
        { title: "Drama", input: "the-loai/drama" },
        { title: "Fantasy", input: "the-loai/fantasy" },
        { title: "Horror", input: "the-loai/horror" },
        { title: "Mystery", input: "the-loai/mystery" },
        { title: "Romance", input: "the-loai/romance" },
        { title: "Sci-Fi", input: "the-loai/sci-fi" },
        { title: "Slice of Life", input: "the-loai/slice-of-life" },
        { title: "Sports", input: "the-loai/sports" },
        { title: "Supernatural", input: "the-loai/supernatural" },
        { title: "Isekai", input: "the-loai/isekai" },
        { title: "Ecchi", input: "the-loai/ecchi" },
        { title: "Harem", input: "the-loai/harem" },
        { title: "School", input: "the-loai/school" },
        { title: "Shounen", input: "the-loai/shounen" },
        { title: "Shoujo", input: "the-loai/shoujo" },
        { title: "Seinen", input: "the-loai/seinen" },
        { title: "Josei", input: "the-loai/josei" },
        { title: "Mecha", input: "the-loai/mecha" },
        { title: "Music", input: "the-loai/music" },
        { title: "Psychological", input: "the-loai/psychological" },
        { title: "Super Power", input: "the-loai/super-power" },
        { title: "Martial Arts", input: "the-loai/martial-arts" },
        { title: "Historical", input: "the-loai/historical" },
        { title: "Vampire", input: "the-loai/vampire" },
        { title: "Magic", input: "the-loai/magic" },
        { title: "Military", input: "the-loai/military" },
        { title: "Parody", input: "the-loai/parody" },
        { title: "Demons", input: "the-loai/demons" },
        { title: "Game", input: "the-loai/game" },
        { title: "Kids", input: "the-loai/kids" },
        { title: "Space", input: "the-loai/space" },
        { title: "Police", input: "the-loai/police" },
        { title: "Thriller", input: "the-loai/thriller" },
        { title: "Time Travel", input: "the-loai/time-travel" },
        { title: "Reincarnation", input: "the-loai/reincarnation" },
        { title: "Mythology", input: "the-loai/mythology" },
        { title: "Detective", input: "the-loai/detective" },
        { title: "Otaku", input: "the-loai/otaku" },
        { title: "Gourmet", input: "the-loai/gourmet" },
        { title: "Workplace", input: "the-loai/workplace" }
    ];

    var result = [];
    for (var i = 0; i < genres.length; i++) {
        var g = genres[i];
        result.push({
            title: g.title,
            input: g.input,
            script: "gen.js"
        });
    }

    return Response.success(result);
}
