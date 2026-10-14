# src実装専用化 — E19実検証

- 実行日時: 2026-10-14T11:58:27.301444+09:00（Asia/Tokyo）。主体: Codex。Node v24.19.0/npm11.9.0、Playwright1.56.1、Chromium 154.0.8037.57。
- 基準: main b702e2daaf7926adc94f62cf1e0ae45da4fe767a＋今回差分。対象SHA: src-implementation-only/files.json。
- C1.5.1/2、D1.3.2/3に接続。契約: operations/plans/2026-10-14-src-implementation-only.md。
- src保持: 現行GAS・Index・編集コード、56使用画像、器官config。README/比較/検査・出所台帳/旧HTML/旧SVG/24旧肖像はdesignへ移設・保全。
- 元68画像: 稼働44画像は埋込URIとbyte一致、保存24肖像は元のbyte/Git Blob一致。PNG35/WebP24/JPEG9を維持。新12アトラスのbyteと描画領域は不変更。
- Nodeテスト: 41実行、41成功、失敗0/スキップ0。旧portrait/SVG実装専用の3つの文字列検査はtests/archiveへ保存し、現行の画像描画は実ブラウザ検査で継続。node.log参照。
- 配布再構築: src/Indexとdesign/previews/Index.composite-v4.html一致。SHA-256 93bddd1882d3d81b945e806044e045187cf36f7ced0c8cdc2d5043a7b100ca4e。56使用画像を自己完結埋込、旧24とSVGコードを格納しない。
- ブラウザ実行: VALIS_PREVIEW_URL=http://127.0.0.1:8766/Index.html、system Chromium preload、npm run test:browser。10項目成功。56decode、36透明領域、全12Lv差/身体1/PNG器官1、14図鑑/履歴、全12実育成480、N15/1000、不正GAS拒否、420px、JSエラー0。
- 描画同一性: E18の全14系統Lv0/Lv3のCanvas SHAと今回が完全一致。comparison.json。整理は造形・画素を変えていない。
- 比較ページ: http://127.0.0.1:8767/design/organ-catalog.htmlでtests/catalog-smoke.cjsを実行。12系統/36領域表示・例外0。catalog.log。アプリ本体のsrc単独配信にはdesignの比較資料は不要。
- src監査: Markdown0、旧版/比較HTML/旧SVG/旧肖像/出所台帳の混入なし。器官設定はpath/regions/roots/display_anchor/display_layerの実装5項目のみ。
- core3/Code.gs/engine/hello-valisは不変更、pixel legacyは元Git Blobのまま移設。git diff --check成功。
- 初期登録E19、既存C/Dと配置/検証/残課題をManifest反映。56ノード全草案。
- 未実施: モックの全身形状一致、画質受入、全部位分解、旧ZIP一致、実GAS/端末FPS、第四相。今回の整理成功をそれらの完成と解釈しない。
- 有効性: 対象SHAと実行条件に一致する今回版に限定。変更観点は再検証。
