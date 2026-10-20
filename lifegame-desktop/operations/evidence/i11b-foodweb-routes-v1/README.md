# I11b 下層・寄生経路と背景処理の限定調整

対象は開発版 **4.2.44**、基準main `1b248aa`。契約は[実行契約](../../plans/i11b-foodweb-routes-v1.md)。正式状態/階層は全61Nodeの草案を保持し、A/B・core・採用画像・UI構成を変更しない。Windows配布済み版は4.2.32、新Windows/ZIPはI12。

## 採用した差分

- 新しい世界だけ `balanceModel: survival/2`。初期主生物の年齢を寿命前半で決定的に混在させ、第一相/世代0/親なしを保持する。出生は従来どおり第一相・年齢0。全主生物が幼体で初期の終宿主Pと寄生Qを配置できなかった条件を、実際に成熟した宿主への合法配置へ変える。配置できる候補がない場合の強制生成は行わない。
- 草棲虫は、見えていて実際に攻撃できる敵の射程を既存の局所危険評価へ加える。固定の逃走命令を追加しない。仮移動で空く自分の元セルを遮蔽に数えず、そこに別個体が残る場合は遮蔽を維持する。
- 菌膜の任意の胞子/因子放出は、出生に必要な可食B3・M0.2を残せる場合だけ行う。新しい栄養源・補充・長寿化は追加しない。
- 自立Qの採食候補は、実在する有限食料から取得できる量と、産卵一回＋既存4T維持に足りないEで評価する。満腹でも餌場が高得点になる固着を解く。感染窓/抵抗/宿主の内部時計非透視・実費は維持する。
- 背景は量子化マスクが厳密に全0の処理だけを省略する。旧overviewの解放と、地形Workerへ未使用素材を転送しない修正を含む。素材・陰影・詳細品質・遠景記号は維持する。

旧 `survival/1` と版なしの計算は保持する。新署名は `ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97`。前版の生態計算署名を新しい規則へ流用しない。

## 原因診断と比較範囲

[下層の原因と短期比較](lower/README.md)、[寄生の段階別診断](parasites/README.md)、[背景の画素比較と限定性能](rendering/README.md)、[短期実画面](runtime/README.md)に、条件/失敗/実費/対象ソースを分けて記録する。

下層の短期比較では、局所回避が増えても出生数/最終数の改善は条件で異なった。Qでは初期配置の改善と、配置後の宿主による除去、限定窓と探索Qの接触不足を区別する。満腹固着の修正後も陸/水50TのQ新定着・羽化は0で、陸では探索による捕食損失が増えた。新生活環成立や生存率改善として認定しない。

固定3条件は[fixed-cases.json](fixed-cases.json)の河川/湖/森林、40×28・初期主160。同じ条件の旧v1/新v2を各500Tで比較する。過去に観測した条件であり、独立評価/未使用条件ではない。新規則への変更一式を比較し、単一要因の因果やR1〜R6の達成へ一般化しない。初期に存在しなかった系統と配置後に消失した系統を分ける。

固定6試行は全て500Tまで完了、0〜500Tの**3,006行**を保持し、有限収支/不変条件の異常は0。[対比較原値](paired-comparison.json)・[生物別要約](500T-species-summary.md)へ接続した。[集計の定義と欠測](aggregation-README.md)を併記し、Pの未記録の死因を推定で補わない。18成果物SHA・署名・実効設定・同一モデルを照合し、旧v1の3条件は前版の実効設定・500T指紋・個体数も完全一致した。

| 500T・出生の実測（旧v1→新v2） | 河川 | 湖 | 森林 |
| --- | ---: | ---: | ---: |
| 主生物500T | 73→60 | 124→130 | 62→88 |
| 草棲虫の累積出生 | 12→5 | 47→59 | 37→33 |
| 菌膜の累積出生 | 5→8 | 11→10 | 1→1 |
| 新版の実初期P/Q | 42/3 | 41/2 | 46/3 |

水棲一次消費者は両版全3条件で500Tまで存続。草棲虫/菌膜/P/Qは両版全3条件で500T=0。新版Qは初期不在ではなく、配置後に維持できていない。侵入試行/新定着/羽化/娘の定着はこの3条件では0。バランス全体の改善や生活環成立とは報告しない。このため固定10条件/未使用3条件の認定試行へ広げず、課題を残して差分を統合する。

回帰は86 unitファイル621件中616成功/既存skip5。別のbrowser3ファイルを合わせ、**89ファイル・624件中619成功/既存skip5・未解決失敗0**。表示設定の検査1件はcold準備と850ms表示期限が競合したため、基準対照で受領/期限を切り分け、検査内の一フレーム時計だけを固定した。製品処理・既存assertは変更せず再検査成功。最初の失敗ログも保持した。実画面は別途4T/43項目で全指紋/全O、操作、IndexedDB新旧保存再生を確認。500Tの実画面速度や全端末性能は未認定。

最終件数・限界・対象署名は [verification-summary.json](verification-summary.json)。背景の12比較はRGBA差0、準備後patch中央値は陸84.2→31.0ms/水85.5→18.0ms/混在91.8→74.9msだった。cold混在は89.1→190.4msで、初使用素材の準備時点が後ろへ移った。ゲーム全体の初回時間/RSSが改善した値にはしない。

## 再実行

```sh
node tools/build-observation-model.cjs --check
node --test --test-isolation=none tests/foodweb-initial-age.test.cjs tests/lower-foodweb-routes.test.cjs tests/survival2-parasites.test.cjs tests/foodweb-archive.test.cjs tests/survival-model.test.cjs
node tools/i11b-foodweb-evaluate.cjs --variant v1 --turns 500 --expect-signature ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97
node tools/i11b-foodweb-evaluate.cjs --variant v2 --turns 500 --expect-signature ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97
```

旧世界の完全一致は `git archive 1b248aa lifegame-desktop/src/ecology` を `/tmp/i11b-baseline` へ展開後、`node operations/evidence/i11b-foodweb-routes-v1/model/legacy-parity.cjs`。別配置では `I11B_BASELINE` を指定する。8優遇経路のv1と両端の版なし、合計50状態と全観測を比較する。

途中で署名が変わった検査は `interrupted-before-self-occlusion-fix/`、`model/interrupted-pre-freeze/`、`runtime/diagnostic-93bf67ea/` に分離し、採用版の成功件数へ加算しない。初回の短期比較で共通ソースの固定が不足した結果は `lower/pre-freeze-unreliable/` に無効理由を残す。

## 残る課題

菌膜・陸一次消費者の自然な世代更新、P/Qの自然長期生活環、未評価の主系統/R1〜R6、小中大/端末別の初回準備・保持メモリはI11継続。前版W群の生存成績や実画面500Tの速度を、新版の合格へ読み替えない。背景の小patch実測をゲーム全体の初回時間/RSS改善へ一般化しない。

最終照合: [208対象SHA](source-hashes.json)、[61Node/16差分・Manifestの照合](final-structure-check.json)、[出力前ゲート](output-gate.json)。検証成功とNodeの正式な草案状態を区別する。
