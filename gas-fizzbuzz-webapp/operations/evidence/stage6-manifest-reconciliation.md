# 工程6 — Manifest初期登録/反映の最終差分・CI監査証跡

日付: 2026-10-14 (Asia/Tokyo)。対象: `chifuru/VAL` の `gas-fizzbuzz-webapp/`。

## 判断と基準

- 比較元main: `1ded76c1109e6b0f59fd70fe04f3429294d20b9a`（工程1〜5のPR #1マージ後）。
- 検証コミット（工程6の記録前HEAD）: `fe801b8873eaffc48f766ee4a6d6f5e3f7919d71`。
- 工程6PR: https://github.com/chifuru/VAL/pull/2
- 実ファイル: A7、B9、C13、D8、E15＝**52 Node File**。工程5main Manifestの構造一覧は51件でE15のみ未掲載。E15は既存のFile・初期登録欄あり。
- 正しい操作は**E15のManifest構造索引への反映**であって新規Node初期登録ではない。独立E16は不要、Node総数は52のまま。
- 状態: 承認済み36、草案16（C1.5.1〜3、D1.3.1〜3、E6〜E15）。E15の草案状態を維持、既存承認済み36件の変更なし。

## GitHub Actions実行

| 実行・検証 | 実結果 | 範囲 |
|---|---|---|
| push run | success: https://github.com/chifuru/VAL/actions/runs/38487651831 | コミット `fe801b8873eaffc48f766ee4a6d6f5e3f7919d71` |
| PR run | success: https://github.com/chifuru/VAL/actions/runs/38487682225 | 同一HEAD `fe801b8873eaffc48f766ee4a6d6f5e3f7919d71` |
| `npm test` | **41/41 PASS・失敗0**（従来35 + 工程6新規6） | Node.js 22、構造index/承認/階層/保護Blobの監査 |
| `npm run check:assets` | **68/68 PASS、2,178,777 bytes** | PNG35、WebP24、JPEG9のGit SHA/MIME/byte一致 |
| `npm run check:composite` | **PASS** | 両HTML同一。HTML SHA-256 `8e6b0f7ee7a33b43cbb1c01b1477bc18ab4231f0baf9a65493c43fb0dc74d324` |
| Chromium real image decode | **104/104 PASS** | 68 source images + 36 SVG provisional organs |
| Chromium lineage/canvas | **14/14 PASS** | Lv0/Lv3描画の画像SHA差を検証、造形完成は主張しない |
| Browser operation | **PASS** | N=15/1000ローカル再生、mock GAS不正応答拒否、420px、JS例外0 |
| protected git diff | **対象0件** | core3定義・Code.gs・Index.pixel-legacy.htmlの差分なし |
| `tests/manifest-consistency.test.cjs` | **6/6 PASS** | 52件双方向一致、36/16状態、同層parent、E15既登録、protected基準5 blob SHA、E15検証出所 |

Chrome写真・実行レポートJSON: https://github.com/chifuru/VAL/actions/runs/38487651831/artifacts/11859928613

## 変更ファイルと保護範囲

工程6の差分12ファイル（監査コミット `fe801b88` 時点）:
- Manifest本体1（E15索引追加、C/Dの限定技術ゲート、ステータス反映）
- C1.5.1〜3、D1.3.1〜3のNode実態6件、E15証跡ノード1件（いずれも草案維持）
- 工程5の証跡追補1、工程6 Plan1、新規整合テスト1、GitHub Actions workflow1
- `valis/core/`3ファイル・`src/Code.gs`・`src/Index.pixel-legacy.html`および実描画コード・アセットは**変更していない**。

## 未実施のゲート

1. 中核9点高解像PNGと元ZIP SHA-256の照合。
2. ローカルv4.2改善肖像24 WebPの本流同期、旧12系統の真正独立Lv器官画像。
3. 透過画素/文字残滓/パーツ接合・外観の原画目視と実スマートフォンFPS、アクセシビリティ全面確認。
4. GAS実デプロイと `google.script.run` の本番通信。
5. 第四相の解放・実装。

**工程6の目的はManifestと実態の一致の監査であり、品質未完を承認済みにすることではない**。この証跡追記に伴う最終HEADのCIは、PR統合前に別途再確認する。
