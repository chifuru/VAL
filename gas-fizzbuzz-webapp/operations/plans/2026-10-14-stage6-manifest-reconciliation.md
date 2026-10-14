# 工程6 — Manifest初期登録/反映の整合照合計画（2026-10-14）

## 操作判断

- ベース: main `1ded76c1109e6b0f59fd70fe04f3429294d20b9a`。PR #1はmerged済み。
- E15は工程5でNode FileとManifest冒頭の初期登録欄に登録済み。**新規IDを作成しない**。E層構造一覧だけE14で終わっていた反映漏れを工程6のFLOW-05で修正する。
- 実Node FileはA7/B9/C13/D8/E15、計52。Manifest構造索引とID・状態・親子関係を一致させ、36承認済み/16草案を維持する。
- C1.5.1〜3・D1.3.1〜3の歴史的な時点付き記述は削除せず、工程5で実際に検証した技術ゲートと未検証の画質・GASゲートを区別して追補する。
- `valis/core/`3定義、`src/Code.gs`、`src/Index.pixel-legacy.html`、アプリ/画像の実装、36承認済みNodeの状態に変更は加えない。

## 実行ゲート

1. `node --test tests/manifest-consistency.test.cjs`：52 Node File対52登録（重複/欠落0）、親ID一致、状態一致、承認済み36/草案16。E15は工程5既登録として構造索引に存在すること。
2. `npm test`：既存35件と工程6追加6件の全成功。
3. `npm run check:assets`・`npm run check:composite`：既存画像68点、実行HTML2本と編集ソースの一致。
4. GitHub差分とNode SHA検査：core3定義、Code.gs、旧Indexを不変更。
5. GitHub Actionsの最終PR HEADでNode/Chromium両job成功、実行run URL・commitを証跡に保存してからmainへ統合。

## 合格としない範囲

中核9点高解像原本PNG/元ZIP SHA、v4.2改善WebP24点、旧12系統の真正器官画像切出し、透明画素品質と人間のモック比較、GAS実環境デプロイと通信、実スマートフォンFPS、第四相。実装工程の承認を画質承認や新規Node承認と読み替えない。

完了後は工程6の監査証跡を`operations/evidence/`へ保存し、E15に新しい検証結果を無条件転用しない。未完了ゲートのリストを残して草案ベースラインを保全する。
