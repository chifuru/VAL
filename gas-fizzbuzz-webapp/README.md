# GAS FizzBuzz Web App

Google Apps Script の HTML サービスを使用し、画面で入力した整数 N について 1 から N（含む）までの FizzBuzz を表示するウェブアプリです。

- 3の倍数 → `Fizz`
- 5の倍数 → `Buzz`
- 15の倍数 → `FizzBuzz`
- その他 → 数字
- 入力範囲は 1～1000 の整数。画面とサーバーの両側でチェックします。

## GASに導入する（未デプロイ）

1. [Google Apps Script](https://script.google.com/) で新しいスタンドアロンプロジェクトを作ります。
2. `src/Code.gs` をプロジェクト内の `Code.gs` として、`src/Index.html` を `Index` という名前の HTML ファイルとして配置します。
3. 必要な場合はプロジェクト設定でマニフェスト表示を有効にし、`src/appsscript.json` の設定を適用します（`appsscript.json` はコードエディタのマニフェストです）。
4. GASエディタの **デプロイ → 新しいデプロイ → ウェブアプリ** から実行ユーザーとアクセス権を確認し、希望する場合に限り明示的にデプロイします。公開範囲を安易に「全員」に設定しないでください。
5. 発行されたウェブアプリURLにアクセスして N を入力し、「計算する」を押します。

**注意:** このリポジトリへのファイル追加は GAS 環境への公開ではありません。デプロイ、権限設定、実際のGASウェブ画面での確認は未実施です。

## ローカル検証

Node.js 18以降で以下を実行します。

```sh
npm test
```

Google Apps Scriptのランタイムをローカルで使用せず、`Code.gs` のロジックを Node.js の VM と HTML サービスのスタブで検証します。画面と非同期通信の実機検証は別途必要です。

## VALIS構造

- `valis/core/`: 変更していない3中核定義。
- `valis/nodes/A/A1.md`: 仕様草案。
- `valis/nodes/B/B1.md`: 機能草案。
- `valis/nodes/C/C1.md`: 実装草案。
- `valis/nodes/D/D1.md`: 検証計画草案。
- `valis/nodes/E/E1.md`: 検証実行後の証跡（存在する場合）。
- `valis/summary/gas-fizzbuzz-webapp.summary.md`: プロジェクト固有の構造と状態の要約。Core Definitionとは別ファイル。

全ノードは初期状態 `草案` とし、公開と承認済み化は行いません。
