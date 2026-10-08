# Publishing Little Legends

**Live game:** https://banx985-gif.github.io/little-legends/

Open that link on a phone or tablet to play the latest build. GitHub Pages serves this folder as-is: no build step, files on the `main` branch, root folder.

## Publish an update

From this folder (`01_CURRENT_PLAYABLE_BUILD/little-legends`):

```
npm run check
git add -A && git commit -m "Describe the change" && git push
```

The live link updates about a minute after the push. Tablets that already have the game pick up new code once the service worker cache name in `sw.js` is changed (the check script expects the new name too). Reload the page once while online.

## Notes

- Only this game folder is the repository. Plans, references, 3D models, build history and `_to_delete` live outside it and are never uploaded.
- `.nojekyll` tells GitHub Pages to serve the files exactly as they are.
- The one-file test build (`npm run standalone`) is written outside this folder and isn't uploaded.
- GitHub rejects files over 100 MB; the largest file here is a few MB.
