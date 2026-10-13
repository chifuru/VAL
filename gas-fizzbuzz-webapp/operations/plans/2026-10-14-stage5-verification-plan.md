# 工程5: tests / 検証計画 / 実行証跡の受入基準（2026-10-14）

対象: `gas-fizzbuzz-webapp/`、作業ブランチ `work/valis-full-mock-baseline-20261014`、PR #1。
検証の責務: D1.1/D1.2/D1.3.1（FizzBuzz・DNA・配布一致）、D1.3.2（画像資産とLv視覚挙動）、D1.3.3（PC/モバイルUI）、D1.4（実GASは別）。
本Planは承認済みノードや `valis/core/` に変更を加えない。

## 1. 実施する自動検証

| 検証ゲート | 実行方法・合格条件 | 主な対象 |
|---|---|---|
| S5-NODE | `npm test` が全件PASS。N=1/15/1000、範囲外、FizzBuzz順序、DNA固定、14系統到達、成熟後完走、交差継承を含む | `tests/*.test.cjs` |
| S5-BUNDLE | `npm run check:composite` がPASS。2 HTML一致・編集CSS/JSの完全埋込・68既存画像保全 | `src/Index.html`、`src/Index.composite-v4.html` |
| S5-ASSET | `npm run check:assets` がPASS。68バイナリとdata URIが同一、Git blob SHAとbyte数/MIME一致 | `assets/composite-asset-ledger.v42-draft.json`、68バイナリ |
| S5-PARTS | 新テストで14系統×器官定義23×Lv3 = 69選択画像参照を確認。先行2系統33個は現物PNG、旧12系統36個は明示的な暫定SVG | `tests/composite-runtime-contract.test.cjs` |
| S5-CHROME | GitHub Actionsの実Chromiumで、全104画像を画像としてデコード。14系統全件でLv0とLv3の主Canvas画素ハッシュ差を検証。ログN15/1000、mock GAS不正応答拒否、420px表示と操作、未捕捉JS例外なし | `tests/browser-smoke.cjs` |
| S5-SCOPE | `main...HEAD` の差分に `valis/core/` 3ファイル、`src/Code.gs`、`src/Index.pixel-legacy.html` が含まれないこと | `.github/workflows/gas-fizzbuzz-stage5.yml` |

Nodeのテストは `npm test`（標準Node test runner）へ登録。ブラウザ検証は別コマンド `npm run test:browser` として意図的に分離し、Playwright/Chromium導入が必要。CIワークフローでNode→Chromiumの順に実行し、結果と撮影画像・JSONレポートを30日間のartifactとして保存する。

## 2. 証跡の記録規約

必ずGit commit SHA、workflow run URL、実行日時、Node/Chromiumの結果、テスト件数、各画像の範囲、スクリーンショットartifact、既知の失敗・未実施を記す。CIが失敗したときは失敗した事実と箇所のみ記録し、成功と称しない。反復実行がある場合は最終HEADに対する結果のみをmain統合の判定に使う。PRの自動チェックはGAS配備の検証に置き換わらない。

## 3. 合格しても主張しない事項

- 旧12系統の36 SVGは原本モックからの切出しではなく、仮造形。全14のCanvas画素差がPASSでも造形完成・原画忠実度PASSではない。
- 旧12系統の24 WebPはv4.2ローカルZIPの改善肖像24点ではない。
- 9 JPEGは参照用縮小見本。元9枚の高解像度PNG/ZIP manifestが欠落しており、元SHA-256照合不可。
- PNGの全画素アルファ品質、文字・背景/罫線残留、アンカー接合・二重全身・外観モックとの近似は人間の目視/元PNGとの比較を要する。
- CIの`file://`ブラウザ検証はGAS HtmlService配信・認可・Google通信・実機フレームレートを保証しない。GAS実配信はD1.4のゲートで別試験。

## 4. main統合判定と次工程

今回のスコープは**草案統合**。S5-NODE / BUNDLE / ASSET / PARTS / CHROME / SCOPEが最終HEADでPASSなら、PR #1の説明に未完を明記したうえで、工程1〜5を草案としてmainへマージ可能（公開GASデプロイ・完成認定・36承認済みの格上げは行わない）。テスト失敗またはprotected変更を発見したらマージを保留する。

工程6はProject Summary Manifest、各C/D/E File、実装実態と証跡の版を突合する独立した作業。工程5の限定照合のみで工程6完了を宣言しない。
