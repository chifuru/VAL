# 工程5 — GitHub Actions Node/Chromium 実検証証跡（2026-10-14）

## 対象・実行ランタイム

- リポジトリ: `chifuru/VAL`、作業ブランチ `work/valis-full-mock-baseline-20261014`、PR #1
- 検証済み実装コミット: `c37e1077506ad619556abb894d9a7233d6e99bc3`（工程5 test/CI追加後の初回完全PASS）
- 成功したCI run（push）: https://github.com/chifuru/VAL/actions/runs/38485929954
- 同一実装のPR実行: https://github.com/chifuru/VAL/actions/runs/38485929621
- 実施時間: 2026-10-14 08:43 JST頃（GitHub Actions runner上）
- 実行環境: GitHub-hosted `ubuntu-latest`、Node.js 22、Playwright 1.56.1、Chromium 141.0.7390.37（headless）
- Browser実測はローカルファイル `file://.../src/Index.html` を起点に実行。**GAS実機ではない**。

## 実結果

| CLI/ステップ | 実測結果 | 結果の境界 |
|---|---|---|
| `npm test` | **35 test / 35 PASS / 0 FAIL** | `tests/*.test.cjs` の全Nodeテスト |
| `npm run check:assets` | **PASS** — 68同一バイナリ、合計2,178,777 bytes | PNG35（RGBA）、WebP24、JPEG9のbyte/MIME/Git SHA。アルファ分布の保証ではない |
| `npm run check:composite` | **PASS** — 2 HTMLと編集ソース一致、68画像維持 | HTML SHA-256: `8e6b0f7ee7a33b43cbb1c01b1477bc18ab4231f0baf9a65493c43fb0dc74d324` |
| protected scope Git diff | **PASS** — `valis/core/`、`Code.gs`、旧 `Index.pixel-legacy.html` 変更なし | `origin/main...HEAD` のパス検査 |
| Chromium image.decode() | **104 / 104 PASS** | バンドル画像68 + 旧12系統SVG仮器官36を実デコード |
| Chromium図鑑/Canvas | **14 / 14 PASS** | 全系統でLv0とLv3のメインCanvas SHA-256が異なる。完成造形認定とは異なる |
| Chromium再生 | **PASS** — N=15/1000完走 | ローカルプレビュー、1000行・末尾Buzz、成熟状態 |
| 不正GASモック応答 | **PASS** — 不正配列を拒否し、ローカル値で補填しない | JS stubのみ、真のGoogle通信ではない |
| Chromium 420px | **PASS** — viewport=420 / scrollWidth=420 / canvasWidth=402 | 代表図鑑切替・15行再生。実機端末ではない |
| 未捕捉JS例外 | **0件** | デスクトップとモバイルの両ページで検出なし |

画像デコードとCanvasハッシュの主張は、実際のChromiumランナーで実行した内容に限定する。旧12系統のSVGは著作的な仮造形であって元モック画素ではない。

## 再取得可能な一次証跡

- 成功Actions run: https://github.com/chifuru/VAL/actions/runs/38485929954
- Chromium screenshot + JSON artifact: https://github.com/chifuru/VAL/actions/runs/38485929954/artifacts/11859013275
- artifact名: `stage5-chromium-evidence`、zip転送 SHA-256 `de511fe3990cfc3577ee9f032011c1baec2b1913fe754ce83be3980fa1c6f012`
- 内容: `desktop-valis-lv3.png`、`desktop-abyss-draft-lv3.png`、`mobile-antimeme-lv3.png`、`report.json`
- テスト元: `tests/composite-runtime-contract.test.cjs`、`tests/browser-smoke.cjs`、`.github/workflows/gas-fizzbuzz-stage5.yml`
- 検証計画: `operations/plans/2026-10-14-stage5-verification-plan.md`

## スコープ外・既知の保留

1. 旧12系統の本物の独立透過器官素材／元モック一致、v4.2ローカルZIPにある改善肖像24点のGitHub同期待ち。仮器官36件を完成PNGとは扱わない。
2. 元の中核9枚の高解像度原本PNG/ZIP manifest SHA照合は未実施（GitHubに存在するのは9点の縮小JPEG）。
3. 原画と画質の人間目視、器官アルファ分布・継ぎ目・背景/文字残滓の定量判定、実端末FPS、実GASデプロイ/通信は未実施。
4. 第四相解放は未実装。36承認済みNodeの承認状態変更なし。
5. 本記録は最初の全検証PASS対象の**実装コミット c37e107**に紐付く。これ以降の文書反映コミットの最新runを別途確認してからmainへ統合する。

D1.3.1〜D1.3.3の該当検証フラグは、実行済みゲートだけ限定して解消候補。GAS D1.4、原画/完成画質は保留。次: 工程6のManifest最終突合と残存ゲート管理。

## 最終PR HEAD・mainマージ追補（2026-10-14）

- PR #1最終HEAD `224802aa7511d26bd5036c2b600021ed556f7b85` に対し、push run https://github.com/chifuru/VAL/actions/runs/38486209105 とPR run https://github.com/chifuru/VAL/actions/runs/38486213825 のGitHub Actions結論はともに **success**。実装テスト/Chromiumを再実行した最終HEADの証跡である。
- PR #1はmergeコミット `1ded76c1109e6b0f59fd70fe04f3429294d20b9a` でmainに統合済み。初回c37e107への検証だけで最終HEADが通過したと主張しない。
- この統合は草案ベースラインの保存であり、元9PNG/改善24WebP/旧12真正器官の画質認定や実GASの公開・実通信を意味しない。工程6は既存E15をManifest構造索引に反映。
