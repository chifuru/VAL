# FizzBuzz生態系 — A仕様モック

ユーザーが示した「FizzBuzz生物が、生態系の餌と環境で進化し能力も育つ」イメージの認識合わせ用。**既存の製品版・Node・Manifestは変更していません。**

[画面（成長後）](evidence/02-growth.png) / [画面（開始時）](evidence/01-initial.png) / [A仕様案と確認事項](SPEC-PROPOSAL.md)

## 起動

Windows配布は[確認済みの専用モック](https://github.com/chifuru/VAL/actions/runs/38832298127/artifacts/12018030861)（**LifeLab-Mock-Windows-x64**）。ZIPを全展開して `LifeLab-Mock.exe` を起動します。元の `LifeGame.exe` とは別のモックです。

リポジトリから動かす場合、`lifegame-desktop` で `npm ci` の後、次を実行します。

```sh
npx electron design/ecosystem-mock/desktop.cjs
```

ブラウザではVALルートで `python -m http.server 8767` を起動し、`http://localhost:8767/lifegame-desktop/design/ecosystem-mock/index.html` を開きます。

## 見る順序

1. 初期状態では実際のFizzBuzzの560行までの育成結果から始まります。出生からのモードもあります。
2. 生物をクリックして選択。基礎DNA、現在の系統、仲間の線、能力の初期値を見ます。
3. 「120ターン進める」で、世界の餌を食べて進化し能力が変わる様子を比較。
4. 同じDNAのもう一方を選び、受けた餌・環境と能力の差を見る。
5. 必要なら比較実験で特定の餌と局所環境を介入させます。

DNAと成長計算・実素材は流用、能力換算式と生態セルからの餌/環境生成は仮仕様です。戦闘・繁殖・淘汰と能力の全行動効果は次段階。

このモックでは `lifegame-desktop/valis/core/` の3中核定義を参照。`SPEC-PROPOSAL.md` は認識合わせ資料であり、Project Summary Manifestや承認済みNodeではありません。

Windows CIでモックの17項目と、配布exeの起動・20ターン進行・158回の実摂取を確認しました。結果は `evidence/windows-mock.json`。製品版の検証・A仕様承認とは区別します。

## 再確認

```sh
CHROMIUM_PATH=/usr/bin/chromium node design/ecosystem-mock/check.cjs
```

Windows等では `npx playwright install chromium` 後、CHROMIUM_PATHを付けずに実行。原版成長の一致、実餌/環境接続、DNA不変、能力成長、画面操作と出生モードを確認します。
