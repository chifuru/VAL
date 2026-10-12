# Hello, VALIS ネオンUIの作成・確認手順

プロジェクト名: `hello-valis`。作業場所: `/workspace/VAL/hello-valis`。
Git リポジトリのルートは `/workspace/VAL`。既存チェックアウトを使用し、worktree は作成しない。
本文中の `src/`、`tests/`、`valis/`、`operations/` はプロジェクトルートからの相対パス。

## 実行契約

- 主 FLOW: FLOW-04 修正。既存の草案UIをユーザー指定の黒×マゼンタのネオン調にする。
- 補助: FLOW-07（検証計画）、FLOW-08（取得済み結果の証跡化）、FLOW-05（登録・反映）、FLOW-12（利用手順の分離）。
- 開始条件: 完全起動済み。標準配置の3中核定義を確認し、第零次前提・Identity Kernel・前提フィードバックを適用する。
- 入力: GAS Webアプリで `Hello, VALIS` を表示し、動きのある黒×マゼンタの画面にする指示。
- 対象: 既存 B1 / C1 / D1、旧証跡 E1、新規 E2。各ノードは草案。
- 承認ゲート: 新規草案・非破壊的な実装・テスト・ローカル検証・Manifest 登録を進める。承認済み化、外部デプロイ・公開は含めない。
- 読むもの: 標準配置の中核3ファイル、今回作成する対象ノード、実装、テスト、取得した結果。
- 作るもの: `src/Index.html`、`tests/cyber-ui.spec.cjs`、E2、ローカル結果ログ、画面画像、権限一覧。
- 更新するもの: Summary Manifest の必要最小限の索引と、対象ノードの実体・検証対応。
- 変更しないもの: Operation / Flow Definition の本文、Git 履歴、既存ユーザー変更。
- 構造展開: 既存 A1 を維持 → B1/C1/D1 の草案更新 → src/tests 更新 → ローカル実行 → E2 → E2 の初期登録 → 既存索引の Manifest 反映。
- 照合: 実ファイル、層間参照、索引、証跡の対象ハッシュ、報告内容の一致を確認する。
- ローカル成果物の完了条件: 実装・テスト・草案ノードが存在し、D1-L / D1-B を実行、E2 を記録、登録・反映・結果照合を行う。
- 未実施条件: D1-G の GAS 実環境表示は、別途実行結果が得られるまで未確認。
- 停止条件: 正本競合、対象不明、既存差分との衝突、テスト失敗、証跡と対象ハッシュの不一致。
- 次の候補: D1-G の結果取得後に FLOW-08。承認済み化は必要な場合のみ別途 FLOW-09。

## ローカル確認

GAS の実行には外部ライブラリ不要。
ローカル確認は Node.js 18 以降、Playwright、Chromium を使用する。
このクラウド環境では既存の Playwright と `/usr/bin/chromium` を使用する。
別環境では Playwright の導入とブラウザの準備が必要。別の Chromium を使う場合は `CHROMIUM_EXECUTABLE_PATH` を指定する。

```sh
cd /workspace/VAL/hello-valis
node --test tests/hello-valis.test.cjs tests/cyber-ui.spec.cjs
```

HtmlService を代替した応答契約と、ローカル Chromium の描画・動きを確認する。Google 上の実行は確認しない。
結果: `operations/logs/cyber-ui-local.txt`。対象ハッシュ等: `operations/logs/cyber-ui-local.json`。
画面画像: `operations/logs/cyber-ui/desktop.png` / `mobile.png`。証跡: `valis/nodes/E/E2.md`。
旧版の E1 は現行UIへ適用しない。GAS 実環境の D1-G は未実施。

## GAS でブラウザ表示を確認する

1. Google Apps Script の新規プロジェクトを作成する。
2. エディタの `Code.gs` に `src/Code.gs` の内容を貼り付けて保存する。
3. HTML ファイルを新規追加し、名前を `Index` にして `src/Index.html` の内容を貼り付けて保存する。
4. 「デプロイ」→「デプロイをテスト」で種類「ウェブアプリ」を選ぶ。
5. 表示されたテスト URL を、プロジェクトの編集権限を持つアカウントのブラウザで開く。
6. `Hello, VALIS`、ネオン画面、停止・再開、スマホ表示を確認する。

テスト URL は編集権限のある利用者向け。一般公開用のデプロイはこの作業に含めない。
確認結果を VALIS に戻す場合は、対象プロジェクト・保存版、確認日時、ブラウザ、表示結果を示す。
URL、認証情報、個人情報は証跡として不要に転記しない。
