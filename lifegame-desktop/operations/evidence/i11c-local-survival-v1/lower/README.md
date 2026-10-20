# I11c 下層3案の診断と否決

基準main **48876e7 / 4.2.44**、実行モード `survival/2`。既観測の固定河川/湖、40×28・主160を各50Tまで計測した。新しい食料、無親補充、寿命延長、主生物一律弱体化、群落化、初期数変更は追加していない。src/tests/Nodeは下層担当では編集していない。**3案すべて不採用。500Tへ広げず、R1〜R6は認定しない。**

| 候補単因子 | 河川 草50T/出生・菌50T/出生 | 湖 草50T/出生・菌50T/出生 | 結果 |
| --- | --- | --- | --- |
| 基準 | 草0/5・菌4/8 | 草7/26・菌5/9 | 比較元 |
| 同種数/適地面積による希少時保護 | 草0/7・菌3/7 | 草1/48・菌4/10 | 出生増が被食へ移り、存続改善なし |
| 草の危険を `t/(1+t)` へ変換 | 草0/5・菌5/7 | 草5/36・菌4/9 | 単敵回避は保つが、複数敵では停止も残る。存続改善なし |
| 菌の出生材料不足時のkeep2E | 草0/5・菌4/6 | 草7/30・菌4/7 | 再建量と被食量が増え、出生低下 |

基準の河川/湖50T指紋はI11b `lower/combined-50.json` の同条件と完全一致。各比較は実効設定SHA一致、監視なし/あり5Tの完全状態一致、不変条件異常0を確認した。50Tの死亡件数や出生増減から、500Tの生存率や一般的優劣を推定しない。

## 観測した詰まり

[約30行の整理](findings.md)に入力量、体量、出生門、到達範囲をまとめる。草の危険飽和、同種の希少性と局所全prey競合、菌のB/Mと親Eを区別した。草棲の適地は水游の全適地を含み、同じprey枠で競合するので、陸水を無関係な別枠とはしない。

菌の食事は河川72/650・湖109/784個体Tにとどまり、同化E平均.156/.208に対して維持費予定平均.149/.149だった。菌自身のcapE溢れは見えず、配分だけでなく既存の有機物/死骸へ到達して取得できる機会が残件。隣接有機物/死骸は既存経路、鉱物は同セルだけで、土壌取得や鉱物reachを追加していない。同種死骸の再取得を外部からの新入力へ数えず、出生8Eの子6E+2Bへの内部移転を純損失へ単純加算しない。

keep2案は第二相・合法出生場所あり・B<3またはM<.2の時だけ8E留保を2Eへ変えた。1E→1B、最大1B/T・capB・最低E2を維持する。材料が揃えばkeep8、出生場所なしは旧keep5のまま。死亡後の救済を行わない。`rec.organic` の下層欠落も確認したが、草の出生E10では蓄えだけでfoodFactorが1となるため、草の主要な出生阻害とは判定しなかった。

## 保存した証跡

- [baseline-50.json](baseline-50.json)：基準2条件の栄養/体量/出生門/死因/指紋。全世界の履歴ではない。
- [rarity-comparison-50.json](rarity-comparison-50.json)、[risk-comparison-50.json](risk-comparison-50.json)、[fungus-comparison-50.json](fungus-comparison-50.json)：各約11〜13KBの比較。riskの局所図式は `decisionFixtures`、fungusの会計/鉱物到達例は `fixture` に保持し、同じ資料を別JSONへ重複保存しない。
- [pressure-baseline-fixture.json](pressure-baseline-fixture.json)：同じ局所集団へ遠方の水游を増やすと、元のglobal rarityが変わる例。水游専用生息域を仮定しない。
- [fixed-cases.json](fixed-cases.json)、[expected-results.json](expected-results.json)：2条件の要求と、当時の全4モデル×2条件の実効設定SHA/終端指紋/数/出生。
- [private-transform.cjs](private-transform.cjs)：否決した3単因子の小さな変換。製品へ組み込まない。
- [diagnostic-runner.cjs](diagnostic-runner.cjs)、[replay-support.cjs](replay-support.cjs)、各 `*-fixture.cjs`、[compare-replay.cjs](compare-replay.cjs)：再現コード。入力sourceを文字列内で変換し、製品sourceへ書き戻さない。

実行時のsource SHAは各比較JSONに原記録を保持する。root並行作業でarchive等の保存/版ガードの物理ファイルSHAが変わった点を、読込済みモデルの更新へ読み替えない。菌候補時は新しいv3ガードとQコードを含むsourceを読んでいたが、**実効指定は全候補ともv2のまま**で、そのv3処理は発効しない。当時のバイト差は [fungus-measured-source-delta.json](fungus-measured-source-delta.json) の約14KBの差分だけで保持する。Git48876e7→当時の小差分→菌の単因子という順で復元し、全3候補とも実ロードした生態11ファイルのSHAが原記録と完全一致した。大きなsource本体は複製しない。再実行した世界の結果は別途、記録済み指紋と照合する。

## Git基準から再現する手順

次の手順は必要なコード30ファイルを一時配置する。証跡には大きなsource本体を複製せず、[baseline-dependencies.json](baseline-dependencies.json) のGit48876e7 SHA256で検査する。準備はPython標準ライブラリとGit、実行はNodeで行い、npmや画像素材は不要。準備先に別の内容があれば上書きせず停止する。

```sh
python operations/evidence/i11c-local-survival-v1/lower/prepare-baseline.py /tmp/i11c-lower-baseline
node operations/evidence/i11c-local-survival-v1/lower/diagnostic-runner.cjs --root /tmp/i11c-lower-baseline/lifegame-desktop --variant baseline --out /tmp/i11c-lower-replay
node operations/evidence/i11c-local-survival-v1/lower/diagnostic-runner.cjs --root /tmp/i11c-lower-baseline/lifegame-desktop --variant rarity --out /tmp/i11c-lower-replay
node operations/evidence/i11c-local-survival-v1/lower/diagnostic-runner.cjs --root /tmp/i11c-lower-baseline/lifegame-desktop --variant risk --out /tmp/i11c-lower-replay
node operations/evidence/i11c-local-survival-v1/lower/diagnostic-runner.cjs --root /tmp/i11c-lower-baseline/lifegame-desktop --variant fungus --out /tmp/i11c-lower-replay
node operations/evidence/i11c-local-survival-v1/lower/compare-replay.cjs /tmp/i11c-lower-replay
```

再試行は1プロセスずつ行う。出力は別の一時フォルダに生成し、今回の実測を上書きしない。[compare-replay.cjs](compare-replay.cjs) は欠けた再現結果を元データで補完せずmissing/終了2とする。揃った場合だけ実効設定・終端指紋・個体数・出生を照合する。

局所の代数/意思決定/有限会計だけを再現する場合は、同じ `--root` と `--out` を付けて `pressure-fixture.cjs --variant baseline` / `pressure-fixture.cjs --variant rarity`、`risk-fixture.cjs`、`fungus-fixture.cjs` を使う。元の出力は比較JSON内に保存済み。

今回の可搬化ではGit30依存の抽出/バイト検査、7CJSの構文、基準/3候補のモデル読込・小変換の成立・3候補の生態11ファイルSHA一致だけを確認した（[portable-check.json](portable-check.json)）。**世界生成・局所fixture再実行・50T再試行は追加していない。** 再配置後の完全再試行成功を推定で補わない。再計算時間は当時各50T約8〜10秒のheadless参考値で、画面速度や性能達成値ではない。
