# Image Composite v4.2 — Editable Source & GAS Bundles

The project has **two synchronized self-contained HTML entrypoints**:

- `../Index.html`: GAS HtmlService entrypoint read by `../Code.gs`
- `../Index.composite-v4.html`: identical independent preview/backup

Both now contain the v4.2 `app.js` compositor's **no-duplicate-juvenile-body** fix. Their source-image archive is still the **68 embedded images from v4.1** (2 core bodies, 33 transparent modular sprites, 24 legacy phase portraits, 9 reference thumbnails). These old portraits are **not** the improved v4.2 ZIP's re-extracted 24 portraits; those image binaries have not yet been committed to GitHub. This is a **behavioral/entrypoint sync, not the completion of all v4.2 artwork**.

## Editable modules

- `Index.template.html`: HTML layout and placeholders `__STYLES__`, `__CONFIG__`, `__ENGINE__`, `__APP__`.
- `styles.css`: dark responsive observation UI.
- `creature-engine.js`: deterministic 14-lineage evolution and FizzBuzz growth contract.
- `app.js`: canvas compositor, playback/codex/history and v4.2 portrait rendering fix.
- `draft-organ-sprites.js`: provisional 12-lineage × 3-level transparent vector sprite generator. **Not** the original mock-derived PNGs.
- `../../design/image-composite-v41-assets.json`: original relative file-name lookup manifest (not image binaries).

**Stage 4 draft:** At startup, `draft-organ-sprites.js` installs 36 standalone SVG `data:` images for 12 older lineages, keyed by each existing `lineage:lineageHeritage` organ (Lv1/Lv2/Lv3), only if no real replacement exists. The existing 33 modular PNGs for `antimeme`/`valis` and the 24 older portraits remain byte-for-byte unchanged. These drafts are transparent and have distinct silhouettes, but have **not** been extracted or pixel-compared against the nine original PNGs. The legacy phase portraits are still full-body artwork; an extra organ is a provisional front overlay, not full decomposition. See `../../design/image-composite-stage4-draft.md`.

The 68 original optimized image `data:` URI values currently live in `window.ASSET_CONFIG.sources` in the bundled `../Index.html`. Their names are referenced by `core`, `partImages`, `lineageImages`, and `references`. We preserve those exact URI bytes without re-encoding or substituting images.

## Repeatable build

From the project root, with Node.js >=18:

```sh
npm run build:composite
npm run check:composite
npm test
```

`tools/build-composite-html.cjs` rebuilds **both** HTML files by extracting the existing embedded asset config and combining it with the editable template, CSS, engine, draft-organ module and app. `--check` fails if either HTML differs from the expected bundle. It refuses missing image data, unknown script layouts, or missing placeholders; the deliberate output is deterministic for the same editable inputs and packed assets. Do **not** replace existing HTML with a blank bundle before using the builder: currently the HTML is the canonical packed image source.

`tests/composite-bundle-sync.test.cjs` checks the actual shipped HTML (not only `app.js`). `npm test` now includes that test and the pre-existing `tests/composite-v42-render-source.test.cjs` alongside the FizzBuzz and evolution tests.

## Verification boundaries

GitHub distribution verification for this stage: the two HTML files have **the same Git blob** and the contents were checked against the four editable template segments; all 68 embedded image data URIs were preserved. A tool-runtime V8 smoke check passed 98 assertions for bundled files, resource inventory, 14-lineage engine, deterministic DNA and basic server FizzBuzz contract.

This stage did **not** execute local `npm test`, a Chromium browser run, actual GAS HtmlService deployment, mobile device benchmarks, or a quality review of the improved portrait/organ PNGs. These are separate D1.3.1, D1.3.2, D1.3.3 and D1.4 verification gates. Refer to the independent stage-3 E14 limited evidence and subsequent test records, not the older v4.2 ZIP-only E13 evidence.

Legacy 64×64 version is preserved separately as `../Index.pixel-legacy.html`. The three canonical VALIS core definitions are unchanged.

Stage 4 adds `tests/draft-organ-sprites.test.cjs` (asset cardinality, distinct level images, SVG alpha, and missing-only fallback). Until Node/Chromium/GAS runs and an independent mock comparison are recorded for this GitHub head, no runtime or finished-art quality PASS is claimed.

## Recovered standalone source images (Stage 4 draft)

The **original 68 embedded** optimized images have additionally been restored byte-for-byte into `../../assets/composite/`, `../../assets/lineage-webp/`, and `../../assets/reference-thumbs/` and indexed in `../../assets/composite-asset-ledger.v42-draft.json`. They are not v4.2 ZIP's improved images or the nine original high-resolution mock PNGs. The GAS HTML still carries the exact same 68 inlined source URI values for self-contained execution; the restoration does not change the runtime.

Run `npm run check:assets` to assert all 68 physical image files are byte-equal to those URIs, with image format and Git blob checks. Open `../../design/stage4-asset-review.html` from a local checkout to review the two ancestor assets, nine reference thumbnails, twelve phase II/III portraits and the 36 provisional vector organs beside the new-lineage PNGs. Browser fidelity / mock matching remains unverified.
