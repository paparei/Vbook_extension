# Extension workflow

## Structure

Each extension lives in its own directory and contains:

- [`plugin.json`](plugin.json): metadata and script mapping.
- `icon.png`: optional extension icon.
- `src/`: runtime scripts referenced by `plugin.json`.
- `plugin.zip`: the VBook download package.

The root [`plugin.json`](plugin.json) must contain a matching catalog entry. Its `path`, `lib`, and `icon` must use the repository's raw GitHub URLs, and the catalog version must match the extension metadata version.

## Before publishing

1. Probe the live site and confirm every selector and URL used by the scripts.
2. Validate JSON and JavaScript syntax.
3. Test every mapped function in VBook: home, genre, browse pagination, search pagination, detail, episode list, server selection, and playback.
4. Build a standard ZIP containing only `plugin.json`, `icon.png` when present, and `src/`. Use forward-slash paths such as `src/home.js`.
5. Extract the ZIP and verify its file list before upload.
6. Verify the raw catalog, manifest, icon, and ZIP URLs return HTTP 200 after pushing.
7. Keep required setup or account/network notes in the extension's `description` instead of the root README.
8. Remove temporary probes, dumps, APKs, test scripts, self-check files, and build scripts from GitHub tracking before committing. Local copies may remain and should be added to [`.gitignore`](.gitignore) when appropriate.
9. **DO NOT DELETE local files during repository cleanup. Never delete [`extension.code-workspace`](extension.code-workspace), [`.vscode/`](.vscode/), or any pre-existing local workspace/config file.** Use explicit Git index operations such as `git rm --cached`; never use broad filename-pattern or recursive filesystem deletion commands.

Publish only after the extension passes the full checklist and can be downloaded through VBook.
