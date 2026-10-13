# Image Composite v4.1 — Editable Source Modules

These are extracted from the exact default bundled HTML (`src/Index.html`, blob `66f338fcd253df87fda46166b5e97389271f49e3`). They make it possible to edit the 14-lineage creature engine, 3-column UI and CSS without manually modifying ~3 MB of embedded image Data URIs.

- `creature-engine.js`: situational evolution for all 14 lineages, six-axis immutable DNA, levelled parts and guided environmental ratios.
- `app.js`: canvas layer compositor, 14-lineage codex, playback/log, historic phase portraits and guided-raising UI.
- `styles.css`: mock-inspired dark responsive UI.
- `Index.template.html`: bundle template placeholders __STYLES__, __CONFIG__, __ENGINE__, __APP__.
- `../../design/image-composite-v41-assets.json`: names of the source images and preserved reference thumbnails. Image binaries and the Python build script are supplied separately with the v4.1 ZIP.

These files are **editing sources**. GAS HtmlService currently serves only `src/Index.html` and `src/Code.gs`. Editing the module files does not automatically rebuild the installed Index.html. Regenerate with the ZIP's `build.py`, verify 14-lineage tests and HTML output, then update `src/Index.html` deliberately.

Original pixel version: `src/Index.pixel-legacy.html`. Approved VALIS CORE definitions remain unmodified.
