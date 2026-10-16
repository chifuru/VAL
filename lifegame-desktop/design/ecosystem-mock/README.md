# Life Lab 03 — 1マス1個体のFizzBuzz生態系モック

[仕様まとめ](SPEC-PROPOSAL.md) / [開始画面](evidence/01-initial.png) / [120ターン後](evidence/02-growth.png) / [動作確認](evidence/report.json)

ユーザーと合意した「20系統＋初期値による個体差」「部位別成長を省いた段階進化・条件分岐」を実際のFizzBuzz素材で確認するモック。オス・メスの繁殖、両親からのDNA継承、各マスの環境、4入力を接続する。元のFizzBuzzと製品版LifeGameは変更しない。

## 起動

[Windowsモックをダウンロード](https://github.com/chifuru/VAL/actions/runs/38837098300/artifacts/12019139553)。外側のアーティファクトZIPと、中の `dist/LifeLab-Mock-Windows-x64.zip` をすべて展開して `LifeLab-Mock.exe` を起動する。`README.txt` と `仕様まとめ.md` を同梱。Windows実測は `evidence/windows-mock.json`。モデル24項目・画面22項目、配布exeの起動・20ターン・摂取1179回・出生20体を確認済み。`evidence/previous-v02/` は旧モックの記録。

リポジトリからは `lifegame-desktop` で依存を入れた後、次を実行する。

```sh
npm ci
npx electron design/ecosystem-mock/desktop.cjs
```

ブラウザではVALルートで `python -m http.server 8767` を起動し、`http://localhost:8767/lifegame-desktop/design/ecosystem-mock/index.html` を開く。元FizzBuzzの `src/assets` が必要。Windows配布には素材を同梱する。

## 見る順序

1. 成体40体から開始し、「1ターン」でオス・メスから子が生まれる様子を見る。
2. マスをクリックし、1マスと個体の対応、系統・DNA・親子・成長・繁殖待機を確認する。
3. 「120ターン」で進化・出生・死亡・系統の残数を比べる。
4. 20系統の一覧と、同系統の異なる初期値・段階進化の見本を比べる。
5. 「成長を観察 / 幼体40体」に切り替えて再生成し、成長の始まりから観測する。
6. 比較実験の4入力で、数値が直接栄養を与えず次の成長を調整することも確認する。

## 仮設定と対象範囲

条件・数値・バランスは認識合わせ用。1マス最大1体で移動中もIDを保ち、別管理のB3/S23セルは重ねない。モデルは部位別XPを持たず、描画用の固定段階テンプレートへ投影する。分岐は現時点では色調と能力に反映する。戦闘は未接続。Windows実行確認やモックテストは、製品版の検証済み・仕様承認を意味しない。

標準coreは `lifegame-desktop/valis/core/`。A1.1〜A1.3、B4/B5、C5/C6、D5/D6と今回のE4を、Project Summary Manifestへ登録・反映する。

## 再確認

```sh
node design/ecosystem-mock/tests/model.test.cjs
CHROMIUM_PATH=/usr/bin/chromium node design/ecosystem-mock/check.cjs
```

Windowsでは `npx playwright install chromium` の後、CHROMIUM_PATHを付けずcheckを実行。描画時間は実測環境付きで記録し、全端末の速度保証にはしない。
