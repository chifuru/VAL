# LifeGame — 生態シミュレーション

固定8環境で、30系統の生物と有限資源の食物網を観測するWindows向けローカルアプリです。同じ初期値と設定から同じ世界・結果を再現します。

## Windowsで起動

[Windowsビルド一覧](https://github.com/chifuru/VAL/actions/workflows/lifegame-windows.yml)で対象版の成功した実行を開き、Artifactsの **LifeGame-Windows-x64** をダウンロードします。外側のZIPと、その中の `LifeGame-Windows-x64.zip` をすべて展開して `LifeGame.exe` を起動してください。DLL・resources・localesは同じフォルダに保ちます。

Windows 10/11 x64用。利用時にNode.js・ネット接続・外部サービスは不要です。設定・観測状態は終了時に消えます。実測対象・環境と制限は[現行Manifest](valis/summary/lifegame-desktop.summary.md)とEノードに記載します。

## 観測する

1. 初期値（空白・改行を含めて使用）、世界の大きさ、主生物数、系統・配分・配置・参加生物群を設定します。
2. **世界を読み込む**で初期状態を準備します。この時点では時間は進みません。
3. **観測を開始**、一時停止、**1ターン進む**で操作します。1000ターンごとに一時停止し、その後も続行できます。主生物全滅時も他群の観測を続行できます。
4. 盤面をクリックするとマス内の主生物・餌生物・寄生階層・資源を観察できます。ドラッグで移動、ホイールと＋/−で拡大縮小、**全体**で全盤面に戻します。
5. **系統樹・説明シート**から全系統の分岐、餌、戦闘、繁殖、寄生、情報を確認できます。図鑑を開いても自動停止しません。

小40×28（主80体）、標準80×56（320体）、大160×112（1280体）。各マスに主1体・餌1体が共存でき、寄生虫Pは宿主、高次寄生虫QはPに付随します。画面外も計算します。表示は点・簡略・詳細を倍率で切り替え、負荷時には実時間の進行を下げます。1/5/10ターン毎秒は要求速度であり、全環境での実効速度ではありません。

## 生態モデル

- 基本20系統はI→II→IIIの3枝→IVの各2枝。追加の早成甲殻は三相、植物・菌・動く餌は二段階です。子は必ずI相から始まります。
- 光→植物→動く餌→主生物→死骸・菌・土壌の有限収支。植物は刈取りで基部を残し、有限土壌から材料を吸収します。有性出生は二親を要する近傍2〜3体。鉱物・情報の候補にはB3/S23の局所CAを使い、供給元の予算も必要です。
- 行動は9つの重みと局所刺激の評価結果です。固定の「群れ戦略」を選択せず、実成果・仲間接触・情報が重みを変えます。同系統は仲間です。
- 有性繁殖はIII以降。浮遊傘の兼性単為生殖、群体節足の繁殖分業・共同育児を含みます。
- 寄生虫の第一/中間/追加中間/終宿主の生活環、高次寄生虫による寄生の抑制と情報の間接操作を扱います。
- 情報は**延長された表現型**の抽象モデル。鮮度・文脈・撹乱があり、DNAの水平伝播は行いません。

仕様の正本は[統合A/B v1.3](design/specification/ab-system-specification-v1.3.md)、着手前の差分は[v1.4](design/specification/ab-readiness-v1.4.md)、生態バランスの調整は[v1.5](design/specification/ab-balance-v1.5.md)、数値は[30系統付表](design/specification/ab-catalogue-v1.md)です。[一枚の全体説明画像](design/specification/atlas-v1.3/ecology-system-master.png)は基本から特殊形態へ読み進められます。v1.4の細則は本文を優先します。

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
