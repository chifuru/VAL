# CR06：淡水光合成体の有限生活の限定証跡

E5 → D7/D8/D8.1 → C7/C7.1/C7.2/C7.4/C8.2。起点 `4e53c41`、対象 `cell-reorganization/1` / `freshwater-comparison/1` の内部接合。[計画](../../plans/cell-floating-life-v1.md)・[C/D契約](../../../design/implementation/cell-reorganization-v1.md)を参照。Core/A/Bの意味・採用造形/数値、正式61Nodeの草案/Graph、UI/画像・製品4.2.77を維持する。

## 結果

**新境界15＋必要回帰56、合計71項目成功、失敗0。** 新方式は8×8の少数fixtureに限定。通常ターン公開・自然多世代循環・500T生存の成立ではない。

| 検査 | 成功 | ログ |
| --- | ---: | --- |
| `tests/cell-floating-life.test.cjs` | 15 | [floating.tap.txt](floating.tap.txt) |
| `tests/independent-plants.test.cjs` | 22 | [independent.tap.txt](independent.tap.txt) |
| `tests/cell-aquatic-resources.test.cjs` | 12 | [aquatic.tap.txt](aquatic.tap.txt) |
| `tests/cell-interactions.test.cjs` | 14 | [interactions.tap.txt](interactions.tap.txt) |
| `tests/cell-space.test.cjs` | 8 | [foundation.tap.txt](foundation.tap.txt) |

実行形は `node --test-reporter=tap tests/<name>.test.cjs`。共有する独立植物の既存処理と、変更に関係する回帰だけを実行する。生成8プロファイルの整合は `node tools/build-observation-model.cjs --check` の [generation-check.txt](generation-check.txt) で照合し、8条件の長期生存検証とは区別する。

## 確認した内容

- 四相×幼体/成体/老齢について、移動する4次生産者として既存の独立植物の容量/寿命/年齢能力を維持する。`group: plant` / `slot: producer` を変更せず、定着高次植物の新表をコピーしていない。初期身体Mは一度だけ計上する。
- 最終所在マスの光/水/Mを共有取得し、移動費を一度だけ支払う。残存膜0なら光E0。蓄えと有限材料があれば実費で膜を回復できるが、無料再生・隣接養分取得・無制限の光はない。光/水の実収支と、満量時の捕捉光/未利用光を区別する。
- 維持→3T留保→成立する投資を共通予算で扱う。成熟した第一相も近隣の合法な4次枠へ無性出生でき、子はI/年齢0・本体2/初期E6/M0.2/身体M0.04を実形成する。出生E10の熱2を二度計上しない。空きなし・M予約失敗に費用や架空の出生実績を残さない。
- 幼体IVは高位相だけで繁殖しない。親のDNA由来/既存変異を保ち、実在するP/Qツリーは親だけに属する。子へ同じ寄生体を複製しない。相と年齢を別に保ち、進化で若返りや栄養補充を起こさない。
- II12/III36/IV80、既存32T窓の三枝/六経路と実進化費を接続。旧相の当T資格を使い、移動だけで経験を得ない。蓄えが満杯でも実際の受光機会を生産枝の判断へ渡す。
- 全同居の4次植物が実在する植物食候補になり、普通の主生物の身体を混ぜない。耐食の可食制限/本体保護を保ち、新膜はT+1まで採食しない。寿命/栄養不足で死亡すると、自由Mと身体Mを含む一つの有限残骸へ移す。
- 競合する親の配列順を逆にしても、出生先・実枠・費用・相が一致する。単一ターンの生活処理を二度実行して追加支払/出生を起こさない。浮遊個体がいない場合の余分な所在索引再構築を避ける。
- 出生/成長を含む3Tの生成元/生成物、Worker差分/JSONを照合。旧独立植物22境界、既存寄生接合14境界、旧方式の固定4Tと再生を確認する。水域検査の専用生活未接続という旧期待は、取得/維持成立へ更新し、通常ターン/図鑑保存の公開ガードは保持した。

## 有効条件と残件

[source-hashes.json](source-hashes.json) の生成元/生成物・検査・計画・文書・生態署名が対象。[final-check.json](final-check.json) はCore/A/B・61Nodeの正式状態/Graph、Manifestの一意性/指定形式と、ログ/生成署名の照合結果。

独立植物の能力/費用/枝/年齢、共有取得、形成/出生、被食、利用可能時点、P/Q所有または対応ソースを変えた場合、該当境界を再評価する。旧再生の署名別名は `cellModel` 未指定に限定する。水域値は明示版のC/D比較で、A/B正式採用・配布既定化ではない。

複数IDの観測/設定/表示/保存・通常ターン公開、群落移動の種指定/再生枝、専用樹冠係数とCR07代表長期は後続。全系統/自然P/Q多世代/500T/R1〜R6・性能・画面・Windows/配布は今回未確認。
