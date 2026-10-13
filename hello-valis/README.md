# Hello, VALIS — Living Field
静かな電子空間に知性が宿るような、自己完結型のGAS Webアプリ。
深い黒、青緑の神経回路状の粒子、まれなピンクの信号。外部AIサービスへの接続はなく、すべてブラウザ内の演出です。

## 体験
- 空間をクリック／タップすると波紋が生まれ、密度に応じて種の生成・引き寄せ・分裂・遠隔反応がランダムに起こります。
- 操作をやめて3秒後、一度だけ中央の文字に光の返答が届きます。
- Hello, VALIS は出現→同調→侵食→交信→再構成を緩やかに循環します。18秒単位を基準に、操作の活性度で変化します。
- 文字の核は読めるまま、文字間隔・色・揺れ・輪郭から伸びる回路が変化します。
- 「動きを止める」「初期化」、中央文字のEnter/Space操作に対応。
- reduced-motion設定時は自動運動と遅延応答を抑え、クリックによる静的変化を表示します。
- 粒子最大100、信号最大24。バックグラウンドでは描画を停止。音・外部アセット・データ保存なし。

## GASへの配置
1. 新規GASプロジェクトの Code.gs に `src/Code.gs` をコピー。
2. HTMLファイルを **Index** という名前で追加し、`src/Index.html` をコピー。
3. 保存してWebアプリとして確認。GASの実行・アクセス制御確認はユーザー担当です。

閲覧範囲は依頼者と指定メンバーのみ。認証は画面のJavaScriptでは実装していません。GAS側でアクセス制御を設定し、許可外アカウントでの拒否も確認してください。
リポジトリ公開とGAS閲覧権限は別です。

## ローカル確認
プロジェクトルート `hello-valis/` で実行:

```sh
node tests/hello-valis.test.cjs
node tests/state.test.cjs
```

ブラウザテスト（Node.jsとPlaywright/Chromiumが必要）:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

今回の結果: 配信スタブと状態シミュレーションは成功。実ブラウザテストはChromium未配置で未実施。GAS実行は未確認。
`src/Index.html` は単体でブラウザ表示でき、GASとは切り離してデザインを確認できます。

## VALIS
仕様・機能・実装・検証計画: `valis/nodes/A`〜`D`
検証証跡: `valis/nodes/E/E1.md`（配信スタブ）、`valis/nodes/E/E2.md`（状態スタブ）
構造正本: `valis/summary/hello-valis.summary.md`
手順: `operations/plans/hello-valis.md`
全10ノードはユーザーの明示承認により承認済みです。ブラウザ・GASの検証完了を意味しません。中核定義3件は本文不変です。

## ノードの最小分割
A1: 上位仕様（維持）。
B1: 生態系と刺激応答 / B2: 文字表現。
C1: GAS配信 / C2: ブラウザ側の体験。
D1: ローカル機能確認 / D2: ブラウザ体験確認 / D3: GAS実行・限定閲覧確認。
E1: 配信スタブ証跡 / E2: 状態スタブ証跡。
全10ノード。兄弟ノードとして分割し、層間はderived_from/implements/verifies/evidence_forで接続します。
コードとテストの物理ファイルは変更していません。D2/D3の成功証跡はまだありません。
