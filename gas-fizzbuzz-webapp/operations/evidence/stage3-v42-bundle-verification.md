# 工程3：画像合成v4.2のGitHub配布HTML同期 — 限定検証ログ

- 記録日: 2026-10-14
- 対象: chifuru/VAL / gas-fizzbuzz-webapp / work/valis-full-mock-baseline-20261014
- VALIS: C1.5.1 / D1.3.1、E14に対応する独立Evidence File
- 検証対象を生成したGit commit: a618fb7e211f0304ac6780e67f438c0884a3a81a
- GitHub配布HTML2本の同一Git blob: `58143d97c89e00d8158b1ec0e18d83c1921a0843`
- 元HTML v4.1 blob: `66f338fcd253df87fda46166b5e97389271f49e3`
- 編集用 v4.2 app.js blob: `4a53d47e6c9cfd868ced2832f08f7ee24e89b134`

## 実行したこと

1. GitHub Git Blob APIからv4.1実行HTMLの**全2,957,916文字**を取得。従来のContents APIでは3MBファイルの`content`が空になるため、旧バイナリを憶測で復元しなかった。
2. 既存HTMLの`<script>`3ブロック（設定＋画像、エンジン、アプリ）と`<style>`の分解位置を確認。
3. `src/composite/Index.template.html`へ旧config・現行styles.css/creature-engine.js・v4.2 app.jsを埋め戻し、元バンドルに対して**APPブロック86文字分のみ変更**であることを確認。
4. 新たな2,958,002文字のGit Blobを作成し、`src/Index.html` / `src/Index.composite-v4.html` を同一SHAでコミット。書戻し後のblob SHAと内容を再取得した。
5. テンプレート4置換箇所とHTML3スクリプトを照合。style・engine・appの内容がGitHub編集ソースと**文字単位で一致**し、実行HTML2本のGit SHAが同一であることを確認。
6. GitHub Blobから`window.ASSET_CONFIG`の実体をJSONパースし、`core`2、`partImages`11種類×3=33、`lineageImages`12系統×相II/III=24、`references`9を検査。`sources`の68 data:image URIを全パスから参照できることを検査。元画像data URIは変更していない。
7. 作業ツールのV8上でエンジンとサーバー関数を**実際に実行**。14系統/全系統のPART_DEFINITIONS、VALIS6＋反記銘5器官、FizzBuzz N=1/15/60/1000の件数と優先判定、同一N=480のDNA再現、GAS Code.gsのN=1000と`doGet()`のIndex参照を確認。`app.js`はV8で**構文コンパイルのみ**（DOM/Canvas実行なし）。
8. 上記のV8検査関数における**98件のアサーションがPASS**。テストのうち1つは画像設定をファイル名とURI直結と誤読して一度失敗したため、実際の`sources[path]`を使用する検査へ修正して再実行し、98項目成功した。

## 実際に作成・変更された成果物

- `src/Index.html`, `src/Index.composite-v4.html`: 同じGit blob 58143d97c89e00d8158b1ec0e18d83c1921a0843
- `tools/build-composite-html.cjs`: 既存埋込configを保全して2HTMLを再構築するCLI
- `tests/composite-bundle-sync.test.cjs`: GitHub配布HTML・内包画像・14系統・JSソースとの一致をNodeで検査するテストコード
- `package.json`: `npm test`の対象に既存v4.2ソーステストと新バンドルテストを含める。builderとcheckコマンド追加
- `src/composite/README.md`, `README.md`: バージョン・限界の説明
- `src/Code.gs`、`src/composite/app.js`、`src/composite/creature-engine.js`、画像データURIは変更なし

## この検証が意味しないこと

- `npm test` / `npm run check:composite` / `npm run build:composite` を **Node CLIで実際に実行したわけではない**。上記のV8試験は別ランタイムである。
- Chromium/Playwright/Canvasの実画素描画、UI動作、420px画面、スマートフォン、GAS HtmlServiceの配信および通信、FPSの検証は**未実施**。
- 以前のv4.2配布ZIPの改善済み旧12系統24派生肖像はGitHubにまだ存在せず、現GitHub HTMLの68画像はv4.1データのまま。旧12系統の真の独立器官Lv画像も未完成。
- 中核原画9枚の正本ZIPと現添付画像のSHA一致も未検証。第4相は名称候補のみ。
- 既存E13のローカルZIP検証はこの新GitHub HTML版に対するNode/ブラウザの成功証跡ではない。画像画質またはGAS実機が検証済みとは報告しない。

## 次の検証

- D1.3.1: Node CLIで`npm run check:composite`と`npm test`を実行し、対象Git SHAと結果を追加のE証跡に記録。
- D1.3.2: v4.2の元ZIP原本と派生24画像を正本SHAで検算し、画素・Lv器官・透明性・モック一致を評価。
- D1.3.3: Chromiumによる14系統図鑑、成熟/歴史、420px、エラー処理を確認。
- D1.4: GAS実機は別契約・別証跡。
