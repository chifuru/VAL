# I11c — 局所探索の修正と下層・寄生の限定比較

対象main `48876e7`（4.2.44）から開発版 **4.2.45**。主FLOW-05、証跡FLOW-08、[実行契約](../../plans/i11c-local-survival-v1.md)。新規計算は `survival/3`、署名 `c78400a515eba25515dd699c1f3f5ba6cc2004c5dc4b992fbf3e4c2d1c6082d9`。Windows配布は4.2.32のまま、新ZIPはI12。

## 採用と見送り

自立Qが満腹かつ手掛かりのない場所、または体外寄生の見えない個体へ到達した場所で停止し続ける問題を修正した。視認できる体外寄生を先に評価し、手掛かりがなければ小さい探索加点を既存の候補評価へ入れる。内部感染・成熟時計・遺伝子・栄養を透視しない。既存の食物/危険/情報も競合し、実移動費と維持2回分を確保できない個体は探索加点を得ない。新しい記憶・強制移動・食物源は追加していない。

探索境界は改善したが、今回の自然条件で次世代の存続改善は示せなかった。初期数・寿命・宿主税・限定感染窓・抵抗・羽化の実費を緩めず、初期寄生Qの羽化を子の定着へ数えない。[寄生診断](parasites/README.md)と[境界検査](../../../tests/local-survival-parasites.test.cjs)を参照する。

下層は河川/湖の同条件50Tで3候補を単独比較した。出生が増えても被食が増えるなど、存続改善を裏付けなかったため**3案とも製品へ採用しない**。500Tへ拡大していない。[小集計と再現方法](lower/README.md)に旧基準・全候補・負の結果を残す。菌膜は体量再建だけでなく、既存食物に到達して摂取する機会と実際の採食圧が次の調査対象。

## 固定した寄生3条件

[事前条件](parasite-cases.json)は水中の動物食3系統、主80体、藻80群落・水游虫80体・淡水光合成体20体、既存の供給/優遇を含む。主系統だけを過去の菌食/雑食条件から動物食へ替えた診断条件で、以前の条件と同一とは呼ばない。seed3件を先に固定し、v2/v3の実効要求は計算版以外同一、初期数・年齢・IDも一致する。

60Tで羽化を観測したため、事前規則に従い**両版・全3条件を120Tまで拡張**した。結果を見てseedを入れ替えていない。全T原値・ID/栄養/感染体の遷移は `parasite-runs/` のgzipへ保持する。[集計](parasite-comparison.json)は[再集計スクリプト](aggregate-results.py)から生成する。

| seed末尾 | Q実初期数 | 同Qの羽化 v2→v3 | Q移動回数 v2→v3 | Q新規定着・産卵・次世代 | 120T P v2→v3 | 120T Q |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| 00 | 4 | 2→2 | 13→29 | すべて0 | 38→33 | 両版0 |
| 01 | 3 | 1→1 | 7→7 | すべて0 | 35→35 | 両版0 |
| 02 | 2 | 0→0 | 12→17 | すべて0 | 25→25 | 両版0 |

Pでは食事経由の感染と死骸経由の同P移行が発生した。新たに定着したPが同IDで中間→終宿主へ達した例は各条件6群体あり、そのPに由来する次の第一宿主定着はv3で3/1/2群体。これは120T内の経路成立例で、全P系統の長期循環認定ではない。[同ID・世代の監査](parasites/natural-route-audit.json)を参照する。Qでは初期寄生個体の同ID羽化を確認できたが、新規曝露/感染/産卵/子の定着は0。窓の存在はQから到達できることを保証しない。供給/優遇付きの短い診断であり、自由条件の長期生存やR1〜R6合格の証拠にはしない。Qの移動増加も、生存改善そのものとはしない。羽化後のQは実費支払い後の残Eが少なく、被食または維持不足で死亡した。窓内Pと自立Qが同時点で隣接する例は0。窓への空間接触と羽化後の存続が次の調査対象で、窓を通過した後の感染成功率が原因だとは断定しない。

120T比較は6実行×121状態＝726状態、60T比較は6実行×61状態＝366状態。合計1,092回の状態検査には重複する前半が含まれる。全実行の有限値/不変条件異常0、全期間O復元成功、60Tの原値は120T再実行の先頭61行と完全一致した。毎T世界全体を複製保存せず、個体の同一性を確かめる必要な寄生遷移だけを保持した。並行headless計測の所要時間を画面速度へ一般化しない。

## 回帰と保存・実画面

- 関連14ファイル **121/121成功**、保存/モデル4ファイル **17/17成功**。重複のない計18ファイル138検査、失敗/skip0。[回帰集計](model/regression-summary.json)、[保存監査](model/archive-compatibility-audit.json)。全89ファイル回帰の再実行ではない。
- 新旧3版×8生成profile×T0〜2の**72状態**で生成モデルと直接sourceが一致。旧無指定/1/2×8profile×T0〜4の**120状態**は基準mainとの完全世界・指紋・全T原値が一致、24全期間snapshotも一致。[可搬runner](model/legacy-parity.cjs)、[結果](model/legacy-parity.json)。
- 実画面 **49項目成功**。新v3で実Worker4Tの全指紋/観測を直接計算と照合し、開始/停止/再開・選択・図鑑保存・再生・別ID保存、旧2/1/版なし再生、v3記録の旧署名への偽装拒否を確認。page/console/Workerエラー0。[実画面証跡](browser/README.md)。短期画面であり、新Windows実機・500T画面・全端末性能は未実測。

## 構造・残件

既存15のC/D/Eを更新し、全61Nodeの正式草案状態・階層・層間参照、A/B/core、R1〜R6、採用画像/近景造形・遠景記号・背景・UI構成を保持する。Manifestは現在の状態のみ。[最終照合](final-structure-check.json)、[対象SHA](source-hashes.json)、[検証集計](verification-summary.json)。

I11継続：下層の実摂取/被食と更新、Pの循環持続、Qの窓への到達/新規定着/羽化後の産卵・次世代、未評価の22主系統/R1〜R6、初回準備・保持メモリ/全端末性能。効果のない係数を採用して完成扱いにせず、阻害段階が変わったかを短期比較してから長期へ進める。新Windows/ZIPはI12、画面構成の再調整は実稼働後。

## 再実行

旧モデルはmain `48876e7` の `lifegame-desktop/src/ecology` を別の一時ディレクトリへ展開する。認証情報や他のworkspaceファイルを含めない。

```sh
node tools/i11c-local-survival-evaluate.cjs --variant v2 --turns 120 --cases operations/evidence/i11c-local-survival-v1/parasite-cases.json --model-root /tmp/i11c-baseline/lifegame-desktop/src/ecology --out operations/evidence/i11c-local-survival-v1/parasite-runs --expect-signature ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97
node tools/i11c-local-survival-evaluate.cjs --variant v3 --turns 120 --cases operations/evidence/i11c-local-survival-v1/parasite-cases.json --out operations/evidence/i11c-local-survival-v1/parasite-runs --expect-signature c78400a515eba25515dd699c1f3f5ba6cc2004c5dc4b992fbf3e4c2d1c6082d9
python operations/evidence/i11c-local-survival-v1/aggregate-results.py
```

既存の一致する成果物はSHAを検査して再利用する。結果を置き換えたい場合は別の `--out` を指定し、旧証跡を上書きしない。
