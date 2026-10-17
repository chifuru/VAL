# LifeGame — 生態シミュレーション

固定8環境で、30系統の生物と有限資源の食物網を観測するWindows向けローカルアプリです。同じ初期値と設定から同じ世界・結果を再現します。

観測版3.1.0では、**蛇行河川・湖沼・湿地・岩地・疎林平原・盆地**の事前地形を選べます。地形用と生態用の初期値を分け、同じ地形で生物配置と生存競争を比較できます。候補地点の地物だけが変わり、地形の版と指紋を最終結果へ保存します。[実画面と検査範囲](operations/evidence/map-ui-v2.4/README.md)を参照してください。

遠景は全個体の位置を系統別記号で示し、近景は専用原画と描き込んだ景観を表示します。3.1で色とノイズの地表を廃止し、草花・苔・林床・砂礫・岩・川床・白波・深水と環境別の地表11素材へ置き換えました。近景は見える場所を128〜256texel/セルで合成し、地物の形に沿う影と局所的な遮蔽解除を適用します。[採用モック・前回・今回の比較](operations/evidence/habitat-visual-v3.1/comparison.png)、[実画面・環境差・検査範囲](operations/evidence/habitat-visual-v3.1/README.md)を参照してください。生物の造形と生態計算は3.0から維持しています。Windows3.1配布版は単体99件・画面46項目・ZIP展開照合・実exe10ターンの検査を通過しました。[配布と検査範囲](operations/evidence/windows-v3.1/README.md)を参照してください。

## Windowsで起動

[Windowsビルド一覧](https://github.com/chifuru/VAL/actions/workflows/lifegame-windows.yml)で対象版の成功した実行を開き、Artifactsの **LifeGame-Windows-x64** をダウンロードします。外側のZIPと、その中の `LifeGame-Windows-x64.zip` をすべて展開して `LifeGame.exe` を起動してください。DLL・resources・localesは同じフォルダに保ちます。

Windows 10/11 x64用。利用時にNode.js・ネット接続・外部サービスは不要です。実行中の観測状態は終了時に消えます。明示終了または主生物全滅で保存した最終結果は、配布物と別のローカルアプリ領域に最大100件保持します。実測対象・環境と制限は[現行Manifest](valis/summary/lifegame-desktop.summary.md)とEノードに記載します。

## 観測する

1. 生態用初期値（空白・改行を含めて使用）、地形（指定/おまかせ）、地形用初期値、世界の大きさ、主生物数、系統・配分・配置・参加生物群を設定します。地形用が空欄なら読み込み時の生態用初期値を使います。
2. **世界を読み込む**で初期状態を準備します。この時点では時間は進みません。
3. **観測を開始**、一時停止、**1ターン進む**で操作します。1000ターンごとに一時停止し、その後も続行できます。主生物全滅時は最終結果を保存して終了します。
4. 盤面をクリックするとマス内の主生物・餌生物・寄生階層・資源を観察できます。ドラッグで移動、ホイールと＋/−で拡大縮小、**選択地点の近景**で表示範囲を絞り、**全体**で全盤面に戻します。画面外の計算は止めません。
5. **系統樹・説明シート**から全系統の分岐、餌、戦闘、繁殖、寄生、情報を確認できます。図鑑を開いても自動停止しません。

**終了して図鑑へ保存**で最終結果と初期条件だけを保存します。途中の一時停止では保存しません。**結果図鑑**から同じ初期条件を再計算でき、再生の完走・中断・反復では記録を追加しません。計算版が異なる記録は再生を拒否します。上限に達したら不要な記録を削除し、保存失敗時は再試行できます。

小40×28（主80体）、標準80×56（320体）、大160×112（1280体）。各マスに主1体・餌1体が共存でき、寄生虫Pは宿主、高次寄生虫QはPに付随します。画面外も計算します。表示は点・簡略・詳細を倍率で切り替え、負荷時には実時間の進行を下げます。1/5/10ターン毎秒は要求速度であり、全環境での実効速度ではありません。

## 生態モデル

- 基本20系統はI→II→IIIの3枝→IVの各2枝。追加の早成甲殻は三相、植物・菌・動く餌は二段階です。子は必ずI相から始まります。
- 光→植物→動く餌→主生物→死骸・菌・土壌の有限収支。植物は刈取りで基部を残し、有限土壌から材料を吸収します。有性出生は二親を要する近傍2〜3体。鉱物・情報の候補にはB3/S23の局所CAを使い、供給元の予算も必要です。
- 行動は9つの重みと局所刺激の評価結果です。固定の「群れ戦略」を選択せず、実成果・仲間接触・情報が重みを変えます。同系統は仲間です。
- 有性繁殖はIII以降。浮遊傘の兼性単為生殖、群体節足の繁殖分業・共同育児を含みます。
- 寄生虫の第一/中間/追加中間/終宿主の生活環、高次寄生虫による寄生の抑制と情報の間接操作を扱います。
- 情報は**延長された表現型**の抽象モデル。鮮度・文脈・撹乱があり、DNAの水平伝播は行いません。

仕様の正本は[統合A/B v1.3](design/specification/ab-system-specification-v1.3.md)、着手前の差分は[v1.4](design/specification/ab-readiness-v1.4.md)、生態バランスの調整は[v1.5](design/specification/ab-balance-v1.5.md)、事前地形・表示・再生条件は[v1.6](design/specification/ab-map-visual-v1.6.md)、年齢段階と独立四相植物は[v1.7](design/specification/ab-life-age-plant-v1.7.md)、年齢能力の補正は[v1.8](design/specification/ab-age-abilities-v1.8.md)、数値は[30系統付表](design/specification/ab-catalogue-v1.md)です。[一枚の全体説明画像](design/specification/atlas-v1.3/ecology-system-master.png)は基本から特殊形態へ読み進められる概念図です。生態数値はv1.5、今回の地形・表示・再生条件はv1.6を優先します。v1.6はA/Bへ適用済みで、製品2.4で地形/開始/再生、2.5で年齢の計算と初期表示を接続済みです。

## 開発・検証

Node.js 22.12以上（CIは24）。

```sh
cd lifegame-desktop
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm start
npm run test:desktop
npm run package:windows
```

Linuxのブラウザは `CHROMIUM_PATH=/usr/bin/chromium` などで指定できます。画面検査はHTTPループバックで行い、配布アプリはElectronのローカルfile表示・Node非公開・外部通信遮断を使用します。Windows CIはZIP全展開後にSHA256を照合し、実exeを起動して進行を確認します。旧 `src/model` / `tests/engine.test.cjs` は旧版の回帰対象であり、現行生態モデルの検証根拠とは分けます。

## VALISの記録

- `valis/core/`：プロジェクト内の3中核正本。無改変。
- `valis/nodes/`：責務別のA/B/C/D/E。全ノード草案を維持。
- `valis/summary/lifegame-desktop.summary.md`：現在のノード状態と必要な説明だけを保持。
- `operations/plans/`：実行契約・作業計画。
- `operations/evidence/`：実測対象ハッシュ、環境、結果、ログ・画面。
- `operations/history/`：必要な場合のみ過去の記録。

分割確認・検査成功・main統合は、ノードの承認済み状態への変更ではありません。

現在の背景は[3.1の比較・実画面・検査範囲](operations/evidence/habitat-visual-v3.1/README.md)。生物の造形の接続範囲は[3.0](operations/evidence/graphics-rebuild-v3/README.md)を維持します。
