# 工程4 — GitHub画像資産・SVG草案の限定読戻し検査

- 対象: chifuru/VAL の作業ブランチ `work/valis-full-mock-baseline-20261014`
- 固定コードhead（検査時）: `f1d1c8cd720da09020503e4050c46ce482449ee7`。対象ファイルはこのコミットに存在する。ここに続くドキュメントコミットは表示/実行内容を変更しない。
- 性質: **GitHubメタデータ・バンドル構造の限定検証**。独立のNode CLI/npm、Chromium Canvas、GAS実配信、スクリーンショット目視ではない。
- 関連責務: C1.5.2、D1.3.2。状態はともに**草案**。

## 実行した事実

1. GitHub `git/trees` と `assets/composite-asset-ledger.v42-draft.json` を再取得し、68個の実バイナリファイルの存在、各Git Blob SHA-1およびbyte数が台帳と一致することを確認: **68/68一致、欠落0、SHA/サイズ差0**。合計 **2,178,777 bytes**。
2. 68点の内訳: PNG35（コア2 + VALIS/反記銘33）、WebP24（既存旧12系統の相II・III肖像）、JPEG9（中核9枚の**縮小見本**）。元バンドル内 `ASSET_CONFIG.sources` の68参照を確認。
3. 元PNG35点のIHDR上の色形式はRGBA（colorType=6）であることをバンドルのヘッダーから確認。**透過画素分布・実画像品質は未検証**。
4. `src/composite/draft-organ-sprites.js` をV8で実行し、12旧系統、36個の全て異なるSVG文字列、SVGの開始/終端、登録キー数13（テスト用PNGキー1 + 新12）、既存VALIS PNGキーの非上書きを確認。画像としての実デコード・Canvas表示成功は未判定。
5. `src/Index.html` 内には旧68点のインライン画像が残り、SVG生成モジュールと `app.js` がともに同一スクリプト内に存在。新規の14系統比較ページ・バイナリ検査CLI・NodeテストファイルがGitツリーに存在。
6. mainを基準に `gas-fizzbuzz-webapp/valis/core/` の定義**3ファイル不変**、`src/Code.gs` と `src/Index.pixel-legacy.html` 不変。PR #1はDraft、mainは未変更。

## 未実施と不合格/保留の境界

- `npm test`・`npm run check:composite`・`npm run check:assets` を**実Node CLIでは未実行**（外部GitHubコードを実行できる作業環境がないため）。
- 旧12系統のSVG仮器官は元モックの画素を切り出したものではない。36 SVGはドラフト造形であり、旧12の真正な部位ごとの透明PNGまたはアトラス完成とはしない。
- 旧12のWebP24点はローカルv4.2改善24枚ではない。原本9PNG・元ZIPマニフェスト・SHA-256は未取得のため一致判定不可。JPEG9点を原本代用しない。
- Chromiumの画像ロード・透明画素品質・レイヤー接続位置・異系統交差継承・UI小画面操作・FPS、実GAS配信、ヒトのモック比較は工程5の独立受入れ待ち。

次FLOW候補: FLOW-08（NodeとブラウザとGASの限定実検証）→ FLOW-05（結果の要約更新）。第4相解放やcore変更は行わない。
