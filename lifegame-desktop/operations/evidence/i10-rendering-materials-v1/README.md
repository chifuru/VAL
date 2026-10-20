# I10 描画・素材・行動表示の限定検証

対象は開発版4.2.42、基準main `a196f8b`。[実行契約](../../plans/i10-rendering-materials-v1.md)に従い、既存C8/C8.1/D9/E6へ接続した。新Node・分割・Manifest初期登録・正式状態遷移はなく、[Project Summary Manifest](../../../valis/summary/lifegame-desktop.summary.md)を反映する。core・A/B・採用原画・既存70画像・生態/乱数/保存モデル・遠景記号・現行UI構成を維持した。計算署名は `a7cac02a9d7382b478919b40c44823ce0d6bb0325b3e551adb1236908c92774d` のまま。

## 実装と素材

Pの保存済みA/B/C形態×本人I〜IIIを潮環/葉環の各9形態へ、Qの本人I〜IVを専用4形態へ接続した。Q IVは旧IIIの暫用を解消し、採用06だけを参照した透過編集を使用する。最初の四相比較編集のIVは旧案に寄ったため除外し、単独編集へ差し替えた。原画そのものは変更していない。[出典・編集・atlas台帳](../../../design/parasite-runtime-v1/registry.json)と[素材準備手順](../../../design/parasite-runtime-v1/README.md)を参照する。

肖像は元の採用区画を保持し、盤面だけ別の透明atlasを使う。P/Qの状態・相・齢・方向を読む表示であり、新能力や感染経路は追加していない。静的セルと事前予熱・有限キャッシュを使用し、実行中に背景除去・最大成分除去を行わない。旧flagなしの身体経路は維持する。

行動マークの受領と850msの表示寿命を分離し、同Tの再描画・段階確定・停止巻戻し・再開で受領済みマークを再演しない。実アプリは成功した世界生成ごとに明示トークンを渡し、同seed再生成も別世代として扱う。受領履歴は3T×512キー、飽和ターンは受領を閉じる。生態・全T観測や独立した演出を省略する上限ではない。

## 実行結果

| 対象 | 結果・範囲 | 証跡 |
| --- | --- | --- |
| 新P/Q素材 | 279項目、例外0。22身体・採用肖像22・透明余白・旧経路12画素比較・本人相/齢/入力不変・初回新素材の画素読取0 | [素材検査](materials/README.md) |
| 静的repack/素材台帳 | 保持した編集から6ファイルbyte一致。56PNG、既存183枝/植物33/量機13と新P/Q22枠の台帳検査成功 | [repack](materials/reproduction.json)、[素材検査出力](model/asset-export.log) |
| 確定マーク | 38項目、例外0。段階/refresh/停止復帰/同seed新世界/飽和、最大1536受領キー | [マーク検査](marks/README.md) |
| 実アプリ操作 | I09操作回帰24項目、例外0。開始/停止/復帰/同画面操作/取消/表示障害復旧 | [操作結果](controls/report.json) |
| Q生活状態の描画 | 48項目、例外0。実engineから得た定着/失敗/除去/同ID羽化・移動/採食の表示fixture、旧描画/肖像/選択も照合 | [Q結果](hyper-regression/graphics-report.json) |
| 既存造形/同居 | 量機15項目・13形態、植物9項目・33形態、齢/肖像/exact-ID。既存21主系統498状態の基準main比画素一致・183枝描画 | [回帰検査](regression/README.md) |
| 独立設定/背景 | display-load-reductionの1試験成功。通常操作の近景背景保持、明示ONのみ簡略、格子/齢/演出/マークと生態不変 | [回帰結果](regression/summary.json) |
| 保存/占有/構造 | archive/display-planeの実11試験とManifest1試験成功。生態署名/旧再生・同居アンカーを確認 | [互換](model/compatibility.log)、[Manifest](model/manifest.log) |

素材・マーク・量機・近景・操作の画像を目視した。[22形態の実行描画比較](materials/parasite-material-22.png)、[量機と下層の同居近景](regression/ryouki/ryouki-six-body-near.png)、[確定マーク](marks/marks-received.png)、[操作画面](controls/controls-final.png)が代表例。合成表示fixtureを自然発生率や生存結果には使わない。

## 検査側の調整と限界

旧4.2.8比較試験はI07以前の情報描画まで同一とするため、現版のI10差分照合には不適合だった。元試験や製品の期待値を変えず、直前mainのart.jsへ比較基準を限定したアダプタで498状態を照合した。詳細は回帰README。固定200/220ms待ちの初期近景はコールド背景の準備前だったため最終画像には使わず、`renderer.prepared`を待って再取得した。実行時の画質低下を許す変更ではない。

Q描画試験は独立した同seed fixtureを明示世代で切り替えるよう更新した。別fixtureの20T→1Tを同じ世界の古いpreviewとして扱う旧テスト前提を解消したもので、製品の巻戻し保護を弱めていない。背景準備も遠景だけでなく近景完了を待つ。localhost制限はネットワーク追加権限で解消し、未実行を成功扱いにしなかった。

本件は表示の仕上げと限定検査。全年齢/全方向の新描き起こし、全密集・全地形の最終外観承認、新モデル自然500T/世代循環・R1〜R6・全端末の性能、実Windows/新ZIPは認定しない。次はI11生存・創発・性能調整、総合配布はI12。Windows配布済み版4.2.32を変更していない。画面構成の追加修正は利用者の指定どおり実稼働後に扱う。

最終対象は[source-hashes.json](source-hashes.json)、結果集約は[verification-summary.json](verification-summary.json)、構造照合は[final-structure-check.json](final-structure-check.json)、出力前ゲートは[output-gate.json](output-gate.json)。実行条件と対象版を越えて成功を拡張しない。
