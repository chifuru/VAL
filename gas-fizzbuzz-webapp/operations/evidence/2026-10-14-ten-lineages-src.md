# 残10系統・完成資産src統一 — E18実行証跡

- 実行日時: 2026-10-14T11:30:17.796215+09:00（Asia/Tokyo）。主体: Codex。環境: Node v24.19.0/npm 11.9.0、Playwright 1.56.1、Chromium 154.0.8037.57。
- 基準: main e23b7ba8a1202efe487668889010ab663e64421fに対する今回差分。対象SHA: ten-lineages-src/files.json。
- D1.3.2/3、C1.5.1/2/3へ接続。実行契約: operations/plans/2026-10-14-ten-lineages-src.md。
- Node: 44件実行/44成功/失敗0/スキップ0。元68資産のbyte/Git Blob、12アトラス出所/出力/36領域/根元/レイヤー、55草案Node/Manifest/保護core、配布HTML再構築を検査。node.logに実記録。
- 既存資産: 元68＋先行2アトラスをバイト無変更でsrc/assetsへ移動。新10アトラスをsrc/assets/organsへ配置。仮SVGは完成レジストリの全12系統に導入0。
- src単独HTTP: python3 -m http.server 8766 --bind 127.0.0.1 --directory /workspace/VAL/gas-fizzbuzz-webapp/src。80画像すべてHTTP byte一致、Index.htmlも実ファイルbyte一致（src-http.json）。src外のdesign/toolsはHTMLの実行依存でない。
- 配布: src/Index.htmlとIndex.composite-v4.htmlが同一/再構築可能。SHA-256 eeb601d8c70110952af6c580cfdca988e9b3bd6468e0fd3114936682dfe2fbeb。原68画像URIのバイトは維持。
- Browser実行: VALIS_PREVIEW_URL=http://127.0.0.1:8766/Index.html NODE_PATH=/workspace/val-setup/fizzbuzz/node_modules NODE_OPTIONS=--require=/workspace/val-setup/system-chromium.cjs npm run test:browser。GAS本番接続ではない。
- Chromium10チェック成功: 80画像decode、14実合成図鑑、36Lv領域の透明/可視画素、全12のLv0/1/2/3サムネイルと主Canvas差（身体1/PNG器官1/旧ポスター0）、14図鑑/履歴名、全12の環境誘導による実育成N480/PNG描画/完走、N15/1000と成熟後完走、不正GAS stub拒否、420pxの横オーバーフローなし、未捕捉JS例外0。report.json/chromium.log参照。
- 一覧: tests/catalog-smoke.cjsを同じVALIS_PREVIEW_URL/NODE_PATH/NODE_OPTIONSで実行。src/organ-catalog.htmlの12系統/36領域表示とJS例外0。catalog.log/organ-catalog.png参照。
- 視覚修正: 旧24肖像には文字/枠線/複数個体/部分見切れがあるため、完成12系統は共通DNA身体と器官を主画面/履歴/図鑑に描画。旧肖像は原バイトで参照保全。腕は前面、眼/装甲は前面、背/枝角は後面、軌道は外部に配置。光帆の根元を末端とは区別して手動調整。
- 原画像と新画像の区別: 新10PNGは配置モックを参照するimage_gen加工派生。元画の実画素切出し・旧ZIP一致・完成画質の人間認定ではない。
- 状態: 全55ノード草案。初期登録E18、既存C/Dと配置/素材/検証/残課題をManifest反映。新規A/B/C/D分割なし、系統/XP/成熟/原文の意味変更なし。
- git diff --check: 成功。core3/Code.gs/pixel legacy/engine/hello-valisは無変更。
- 未実施: 1旧系統1器官を越える全部位分解、完成画質の人間承認、旧ZIP同一性、実GAS/実端末FPS、第四相。
- 有効性: 対象SHA・実行条件が一致する今回版に限定。資産/座標/レイヤー/描画/テスト/Node/Manifest変更で該当観点を再検証する。
