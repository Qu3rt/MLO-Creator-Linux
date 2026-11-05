# Manual checks used while porting

These are the JavaScript snippets run in the real editor through the window's developer hook
(`mlo-shell --eval-file ...`). They are not part of the program; they are examples of how the port was
checked and a starting point for your own checks.

Start the host without its own window (use `--dev` so the token is fixed to `dev`), then run the native
window against it. The snippets expect the project "My Interior" and port 47802; adjust them.

```bash
cd linux
dotnet src/bin/Release/net9.0/MloCreator.dll --no-window --dev --port 47802 --root "$PWD/.." &
src/bin/Release/net9.0/mlo-shell --url http://127.0.0.1:47802/ \
    --data "$PWD/src/bin/Release/net9.0/cache/window" \
    --eval-file tests/websgl-probe.js --eval-exit
```

| File | Checks |
|---|---|
| `websgl-probe.js` | asks WebKit for WebGL 2.0, the renderer and the app's renderer state |
| `open-project.js` | opens "My Interior", waits for the model, frames it and returns the mesh stats |
| `export-test.js` | opens the project, clicks Export, waits for the result and returns the log lines |
| `close-test.js` | opens the project, marks it changed; use with `--close-after 12` to check that closing the window saves the project |

Add `--screenshot out.png --screenshot-exit` to save the window contents (X11), as used for the
screenshots in `docs/screenshots/`. On Wayland, use the desktop's screenshot tool for the window.

The host's `--debug-api` writes the last `/api/export` request to `logs/export-payload.json`, which is
handy to replay an export with curl or Python.
