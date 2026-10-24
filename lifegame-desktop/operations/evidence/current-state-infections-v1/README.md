# CS05：環境感染量・共有遺伝型の限定証跡

起点 `c373ceba51ec055c299905813f30059bc8ce05db`。製品4.2.77を維持。生態署名 `6b96341c7304a469ca5bc66232d7b479434890c02d1650ef688c458921705ca6`。[実装契約](../../../design/implementation/current-state-infections-v1.md)、[対象ハッシュ/判定](report.json)。既存C7/C7.1/C7.5→D7/D8.2→E5、C8.2→D9→E6の限定範囲。

## 結果

| 確認 | 結果 | 証跡 |
| --- | --- | --- |
| 新しい集約境界 | 16成功。1,000件→1在庫/1遺伝型、異なる期限/経路/段階/適応/親の分離、宿主別状態・一匹移行の保持、未参照型解放、短いID、有限水中分散、卵の実量付着/孵化/翌T定着/失敗、微小抵抗の終了とQ残留期限 | [infections.log](infections.log) |
| 新方式の短期結合 | 上記16内で代表1条件の生成元/生成物4Tが一致。途中取消の元世界不変、確定時の不変条件/型参照を確認 | [検査コード](../../../tests/current-infections.test.cjs) |
| 関連境界 | 既存卵10・CS04関係/観測16・CS03土壌17の計43成功 | [related.log](related.log) |
| 通常ターン/Worker | 7成功。一括/段階、生成元/生成物、取消/失敗、Worker、短期保存再生と500境界 | [turns.log](turns.log) |
| 従来方式の起点比較 | 3条件×T0〜T2で世界と観測行が一致。CSVはraw署名以外一致。旧再生結果と原bytes/件数を保持 | [legacy-parity.json](legacy-parity.json) |

計66項目と従来3条件の比較。500境界は時計499から2Tであり、自然500T走行ではない。新方式4T一致は生成元/生成物間であり、旧規則との一致ではない。自然の寄生多世代・全系統存続を認定する結果ではない。

## 再実行

```sh
node --test-reporter=tap tests/current-infections.test.cjs
node --test-reporter=tap -e "require('./tests/primary-eggs.test.cjs');require('./tests/current-relations.test.cjs');require('./tests/current-soil.test.cjs');"
node --test-reporter=tap tests/cell-turn.test.cjs
git show c373ceba51ec055c299905813f30059bc8ce05db:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-infections-baseline-modules.js
node tests/current-infections-legacy-parity.cjs /tmp/current-infections-baseline-modules.js
node tools/build-observation-model.cjs --check
```

## 有効範囲と残件

同条件量の集約と遺伝型共有による保持構造を確認した。宿主内の実P/Q・付着/侵入済み・一匹移行はまとめず、必要な直接参照・時計・有限量を維持する。量の分散/付着は新しい集約規則である。

新方式は明示指定の内部比較のみ。通常図鑑の新状態保存拒否を維持し、新規則を旧結果互換として扱わない。UI配置・画像・既定モード・製品版・配布は維持。自然500T/自然多世代、総合性能・描画・画面操作・Windowsは未実施。1,000件→1在庫は構造の確認であり、総合速度改善率ではない。次はCS06、通常画面/Worker/図鑑への全接合はCS07。
