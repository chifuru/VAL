# VALIS verification audit (read-only)

Scope: D1, D1.1, D1.2, D1.3, D1.3.1, D1.3.2, D1.3.3, D1.4; E1–E19; latest E18/E19 evidence; all current test files/build tools/Code.gs/app playback paths. No repository changes. Independent reproductions use Chromium 154.0.8037.57, Playwright 1.56.1 and HTTP src/Index.html on localhost:8766. Existing npm/browser suite not rerun by this agent.

## Findings

1. Invalid N reset throws and can strand the control state. app.js:72–75 sets requestToken/busy/stop/seed before E.initial validates. resetButton:358 permits 1001/negative and floors decimals. Repro: start N480, change input1001, click reset → pageerror "個体Nは1〜1000", run disabled=true/pause disabled=false/count unchanged1/480 while playback timer has stopped. /tmp/valis-control-audit.json.
2. Reduced-motion does not follow the declared direct-final contract. B1.2:13,32 and C1.3:13,36 specify immediate skip-equivalent display. app.js:99–103 always starts setInterval; mediaReduced only suppresses animation. Repro reduce+N1000→3/1000, LIVE育成中 after150ms. tests/browser-smoke:37,163 uses reduce but explicitly invokes skip at125,137,143,177, so never tests this contract.
3. N/random state does not synchronize input. app.js:72–75 reset does not update seedInput;359 random resets specimen only. Fixed Math.random=0 → ID#0001/count0/1, input still480; start returns ID#0480. Decimal reset15.9 quietly becomes15 while input remains15.9. /tmp/valis-control-audit.json.
4. System motion preference changes are ignored. app.js:6 caches matchMedia.matches once and scheduleFrame:194–198 reads only that constant. Repro load no-preference then emulateMedia reduce→11 mainCanvas frames in subsequent200ms. /tmp/valis-control-audit.json.
5. Reset leaves stale status text. app.js:72–75 does not set notice. During pending GAS request reset successfully cancels request and restores LIVE待機/run enabled, but notice remains GAS取得中. This is display inconsistency, not stale-response corruption. /tmp/valis-async-audit.json.
6. Existing 44-image rebuild is not sourced from source image files. tools/build-composite-html.cjs:32–38 parses embeddedConfig(existingHtml), preserving core/part/reference data URIs; only12 authored atlas PNGs are read43. Instrumented sourceBundle current main matches exactly but reads0 paths under assets/composite/reference-thumbs. Editing those standalone44 images then build will preserve old inline images; check:assets detects discrepancy afterward. Existing Index.html also required as input65–68. Comment5–8 states interim canonical-HTML model; this is a maintainability constraint, not evidence that current images are missing.
7. Current suite coverage is narrower than total PASS counts might imply. tests/creature.test.cjs:5–9 executes CONFIG/ENGINE only, app.js is not run by those13 tests. fizzbuzz.test:77–84 only regex-detects failure handling. Browser suite checks preview/static drawings, all live runs immediately skip, one malformed GAS response; no actual GAS, async pending/failure/stale response, ordinary completion, pause/resume, restart-invalid, OS preference change, keyboard/accessibility/full mock equality. Four of41 Node tests still inspect archived SVG generator (tests/draft-organ-sprites:8). Original33 modern PNG alpha pixel coverage is not checked by browser alpha loop64–77, which covers only12atlas regions. No full mock visual acceptance asserted.
8. No present GAS completion evidence. Code.gs:5–7 invokes real HtmlService only at runtime; fizzbuzz.test:10–23 substitutes HtmlService VM stub. D1.4:6–8 and E19:16 accurately mark actualGAS untested. HTML self-containment is valid independent of actual service acceptance. Current Index23,885,543 bytes; actual HtmlService performance and editor/deployment behavior remain unmeasured. No undocumented hard size limit asserted.

## Independently confirmed good paths

- Pending server request disables run/pause/skip.
- Valid reset discards pending success callback; stale failure does not corrupt subsequent pending request (app.js requestToken guards123/130).
- Most recent valid server response N5 completes exactly1,2,Fizz,4,Buzz.
- withFailureHandler displays supplied error, restores run and leaves log empty.
- Pause after4/100 retains4/100 after200ms; environment switch while paused plus skip completes100rows.
- N30 ordinary playback12ms and immediate skip yield exact equality for original log, phase, lineage, points, maturity, heritage, parts text and Canvas data; no exceptions.
- E19 operations/evidence/src-implementation-only/files.json has84 entries, all current SHA256 match. Saved report has10 PASS/errors0/14lineages. commit="local", version pinned by hash inventory. Old E1–E18 are explicitly historical/limited and should not be reused for current success claims.
- All D/E current headers draft; historical approvals are separated from current status. Tests success does not imply approval.

Evidence files: /tmp/valis-control-audit.cjs/.json, /tmp/valis-async-audit.cjs/.json. No source/test/node/core changes.
