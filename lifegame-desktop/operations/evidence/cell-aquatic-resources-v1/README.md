# CR06：水域の有限資源・下層生活の限定証跡

E5 → D7/D8 → C7/C7.1/C7.2/C8.2。起点 `294d1b6`、対象 `cell-reorganization/1` と明示した `freshwater-comparison/1`。[計画と比較値の導出](../../plans/cell-aquatic-resources-v1.md)・[C/D契約](../../../design/implementation/cell-reorganization-v1.md)を参照する。水域値は正本13.3節に委ねられた実装比較であり、A/B正式採用や配布既定化ではない。

## 結果

**新境界12＋必要回帰49、合計61項目成功、失敗0。** 小さな8×8 fixtureだけの限定確認。全テスト/水系全体/自然多世代循環/500T生存を認定しない。

| 検査 | 成功 | ログ |
| --- | ---: | --- |
| `tests/cell-aquatic-resources.test.cjs` | 12 | [aquatic.tap.txt](aquatic.tap.txt) |
| `tests/cell-resources.test.cjs` | 20 | [resources.tap.txt](resources.tap.txt) |
| `tests/cell-circulation.test.cjs` | 21 | [circulation.tap.txt](circulation.tap.txt) |
| `tests/cell-space.test.cjs` | 8 | [foundation.tap.txt](foundation.tap.txt) |

実行形は `node --test-reporter=tap tests/<name>.test.cjs`。生成8プロファイルの整合は `node tools/build-observation-model.cjs --check` の [generation-check.txt](generation-check.txt)。8条件の長期生態検証を行ったという意味ではない。

## 確認した範囲

- 専用版を明示した水域だけ、水分上限40/初期32・局所入力8×雨倍率・基準蒸発0.5、底質Mの乏しい4/16・標準8/32・豊か16/64を解決する。水域水量と土壌保水量を分け、底質M上限へ共通土壌の質を適用する。陸の水分30/15・降雨6.5・M5/20を維持する。
- 未指定の水域は未解決のまま。未知の版を設定時に拒否し、固定状態の版/在庫と設定が一致しない場合も検出する。陸からの暗黙コピー・旧世界への自動移行を行わない。
- `waterInput` と `rain` を区別し、水域で両者を重ねない。入力・排水・蒸発・実利用の水収支、一回限りの更新、空在庫での蒸発/生産0を確認。基底のMを隠れて補充せず、既存の明示M入力は別台帳へ計上する。
- 微藻/水生植物6群が光15.6を一つだけ共有し、実利用15.6Eに水6を支払う。植物は光/無機養分だけを要求して非捕食を維持する。底質M不足では同マスの実要求で競合し、暗所は光Eを生成しない。
- 水游虫の小集団が隣接マスの葉を遠隔取得しない。実際に入った後は所在マスの実在葉を有限採食し、基部を残す。新たな動物個体AIや全履歴を追加していない。
- 水域の分解者が実有機物/死骸を使い、水分を支払って分解する。未保持Mは次T還元、0次上限で受け取れない分は有機物として残る。上限による黙った切捨てや二重在庫を作らない。
- 生産者・水游虫・分解者と旧死骸を配置した3Tで、実取得・生活・在庫・E/M収支を接合し、生成元/生成物・Worker差分/JSONの状態を照合した。旧死骸は検査入力であり、観察中に自然死亡から全循環が成立したとの主張には使わない。
- 旧方式の固定4T結果と再生を確認。新方式の通常ターン/図鑑保存ガードを保持する。淡水光合成体は4次/植物属性を維持し、専用生活が未接続であることも確認する。

## 有効条件と残件

[source-hashes.json](source-hashes.json) の実装/生成物・検査・文書・生態署名が対象。[final-check.json](final-check.json) はCore/A/B・61Nodeの正式草案/Graph、Manifestの一意性と指定形式、ログ/生成署名の照合結果。

水域版・入力/保持/蒸発/底質係数・共有取得・利用可能時点・対応ソースを変更した場合は該当境界を再評価する。未指定の世界へ結果を転用しない。旧再生の署名別名は `cellModel` 未指定に限定する。

淡水光合成体の専用生活、群落移動の対象種/再生枝、観測/設定/表示/保存と通常ターン公開、CR07代表長期は後続。Core/A/B・正式構造・UI/画像・製品4.2.77を維持。全系統/自然P/Q多世代/500T/R1〜R6・性能・画面・Windows/配布は今回未確認。
