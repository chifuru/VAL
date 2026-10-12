# Hello, VALIS

Google Apps Script の Web アプリ。`Hello, VALIS` を黒×マゼンタのネオン画面に表示します。
動くグリッド、回転する光、停止・再開操作、スマホ表示、動きを減らす端末設定に対応します。
GAS で動かすための外部ライブラリは不要です。

## GAS で実行する

1. Apps Script のプロジェクトを作成します。
2. `src/Code.gs` をエディタの `Code.gs` に貼り付けます。
3. HTML ファイル `Index` を作成し、`src/Index.html` を貼り付けて保存します。
4. 「デプロイ」→「デプロイをテスト」→「ウェブアプリ」のテスト URL を開きます。

テスト URL はプロジェクトの編集権限を持つアカウント向けです。
GAS 上の動作と公開範囲は別途確認してください。

## ディレクトリ

```text
hello-valis/
  src/          GAS のコードと HTML
  tests/        応答契約・ブラウザテスト
  valis/core/   VALIS の3中核定義
  valis/nodes/  A/B/C/D/E の草案ノード
  operations/   利用手順・実行資料・画面画像
```

このディレクトリがプロジェクトルートです。`valis/core/` などの正本パスは、ここから解決します。

## ローカル確認

Node.js 18 以降、Playwright、Chromium を使用します。
クラウド環境には Playwright と `/usr/bin/chromium` が用意されています。
別環境では Playwright とブラウザを準備し、必要なら `CHROMIUM_EXECUTABLE_PATH` を指定します。

リポジトリのルートから:

```sh
cd hello-valis
node --test tests/hello-valis.test.cjs tests/cyber-ui.spec.cjs
```

検証は HtmlService の代替実装とローカル Chromium で行います。GAS のホスティング・認可は検証範囲外です。
ノード状態と現行の検証証跡は `valis/core/VALIS Summary Manifest.md` を参照してください。
