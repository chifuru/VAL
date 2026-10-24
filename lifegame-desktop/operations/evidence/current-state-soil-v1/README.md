# CS03：死骸の土壌統合と共有要求・限定確認

起点 `383fd48e72dda4e57d055417c71830f65bb987da`。製品4.2.77を維持。生態署名 `f56d08f2c07ba4174f5b902d69c7781d47ad8dbf9f1d514598d36fb443a142fd`。[実装契約](../../../design/implementation/current-state-soil-v1.md)、[対象ハッシュ/判定](report.json)。既存C7/C7.1/C7.2/C7.3/C7.5 → D7/D8/D8.2 → E5、C8.2 → D9 → E6の限定範囲。

## 実装と構造確認

明示current-state/1に、新鮮0〜9T・分解中・M保持待ちを接続した。死骸の栄養を同マスの分類別在庫へ一度だけ引き渡す。BはE内成分であり、同T捕獲は実際の参加者に限定し、残量の一般利用は次Tからとする。

同じマス/分類/日齢の人工死骸**2,000件を一つの新鮮在庫**へ統合し、E/M/Bの保持を確認した。分解者1体の同じ在庫への要求は、死骸1件でも1,000件でも1件。これは処理構造の確認であり、ゲーム全体の速度改善率を測ったものではない。

P/Qと有効な曝露がある担体だけ現在のID/期限を保持する。担体の栄養は0で、実際の採食を介して有限曝露/成熟Pの経路を接続する。古い死者のDNA/外見や、消失した栄養を複製しない。移動時の餌評価と自律Q探索も現在在庫を参照する。

## 結果

| 確認 | 結果 | 証跡 |
| --- | --- | --- |
| 新しい土壌境界 | 17成功。集約/分類/収支、同T資格/次T利用、日齢10、共有配分、同化0.5、微量/満杯/乾燥、P/Q単一保持/期限/実採食による移行 | [soil.log](soil.log) |
| 新方式の短期接合 | 上記17内で代表1条件の生成元/生成物4Tが全世界一致。途中取消の元世界不変と各Tの不変条件が成功。生成物側だけ12Tまで延長し、日齢10の移行を含めて不変条件が成功 | [検査コード](../../../tests/current-soil.test.cjs) |
| 関連境界 | 56成功。既存資源23・捕食18・CS02情報15 | [related.log](related.log) |
| 通常ターン/Worker | 7成功。既存の一括/段階、生成元/生成物、取消/失敗、Worker3形式、短期保存再生、500境界 | [turns.log](turns.log) |
| 従来方式の起点比較 | 3条件×T0〜T2で全世界と観測行が一致。CSVはraw署名のみ異なる。旧記録の再計算結果と保存bytes/件数を保持 | [legacy-parity.json](legacy-parity.json) |

計80項目。500境界は時計499から2Tの検査であり、自然500Tではない。新方式の4T一致は新方式の生成元/生成物間の一致で、旧規則との一致ではない。

## 再実行

```sh
node --test-reporter=tap tests/current-soil.test.cjs
node --test-reporter=tap -e "require('./tests/cell-resources.test.cjs'); require('./tests/cell-predation.test.cjs'); require('./tests/current-information.test.cjs');"
node --test-reporter=tap tests/cell-turn.test.cjs
git show 383fd48e72dda4e57d055417c71830f65bb987da:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-soil-baseline-modules.js
node tests/current-soil-legacy-parity.cjs /tmp/current-soil-baseline-modules.js
node tools/build-observation-model.cjs --check
```

## 有効範囲と残件

内部比較の在庫/要求/感染引渡しと、従来経路の短期接合だけの証跡。新状態の図鑑保存拒否は維持し、新集約規則の旧署名互換は作らない。条件付き互換はcurrentStateModel未指定の変更していない経路だけへ適用する。

関係/摂取構成・過去世代統計の生態からの分離はCS04、卵/感染体はCS05、活動マス/待機はCS06、全T観測/Worker/画面/図鑑の新形式全接合はCS07。長期自然500T・自然P/Q多世代・全系統存続・総合性能/描画・ブラウザ操作・Windows/配布は未実施。生物数が増えた場合の負荷が一定になることや、全体の肥大化解消を保証しない。
