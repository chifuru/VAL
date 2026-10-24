# CR06：植物共生体の共有光接続の限定証跡

E5 → D7/D8/D8.1 → C7/C7.2/C7.4/C8.2。起点 `76d5f0f`、対象 `cell-reorganization/1` の内部接合。[計画](../../plans/cell-photosynthesis-v1.md)・[C/D契約](../../../design/implementation/cell-reorganization-v1.md)に従う。正式61Nodeは草案のまま。Core/A/Bの意味・採用係数、UI/画像・製品4.2.77は維持する。

## 結果と対象範囲

**新境界13＋必要回帰64、合計77項目成功、失敗0。** 8×8の限定fixtureであり、全生態・水系・500T生存の認定ではない。

| 検査 | 成功 | ログ |
| --- | ---: | --- |
| `tests/cell-photosynthesis.test.cjs` | 13 | [photosynthesis.tap.txt](photosynthesis.tap.txt) |
| `tests/cell-resources.test.cjs` | 20 | [resources.tap.txt](resources.tap.txt) |
| `tests/cell-predation.test.cjs` | 18 | [predation.tap.txt](predation.tap.txt) |
| `tests/cell-life-cycle.test.cjs` | 18 | [lower-life.tap.txt](lower-life.tap.txt) |
| `tests/cell-space.test.cjs` | 8 | [foundation.tap.txt](foundation.tap.txt) |

実行形は `node --test-reporter=tap tests/<name>.test.cjs`。変更に直接関わる境界と回帰だけを使う。生成8プロファイルの整合は `node tools/build-observation-model.cjs --check` の [generation-check.txt](generation-check.txt) で照合し、8条件すべての長期観察とは区別する。

## 確認した内容

- 植物共生体 `kelp` は主生物のまま、最終所在マスの一つの光予算と水分を共有する。旧prepareの別立て無償光を重ねず、隣接や移動元から水/光を取らない。土壌Mの直接吸収も新設しない。
- 基礎光1.5と既存相係数1/1.1/1.2/1.3、年齢の光係数を一度だけ適用する。四相×幼体/成体/老齢を確認。専用の高さ係数は未選定で、既存受光面積1/高さ優位なしの基底帯0を比較接続に使う。通常植物の維持/繁殖表へ変えない。
- 光の捕捉と利用を区別し、葉が残る高次植物の遮光、水不足、温度/pHによる半活性/停止を確認する。光E2.6につき水1を実利用分だけ支払う。未利用光をE在庫や次Tの物質へ変換しない。
- 光と採食が同じE需要を満たす。Mだけが不足している場合の有用な採食は継続し、純Eの配分済み光を先に実移転して水の無駄払いを防ぐ。食物の不可避な余剰E/Mは既存の次T物質へ渡す。
- 候補評価・自動要求・直接要求の全入口で、植物共生体の植物/菌食を拒否する。生体・植物死骸・物理資源を含め、拒否前後で在庫が変わらない。植物資源が豊富でも小型動物の捕獲が成立する。
- 実光Eをイベントと当T記録へ一度だけ接続。E≥60/M≥1のE1→G1、旧相の当T資格、年齢継続を維持し、進化で蓄えを補充しない。出生体はそのTの受光/採食要求へ入れない。取得の重複実行は拒否する。
- 入力配列の入替、E/M収支、光/採食の2T、生成元/生成物・Worker差分/JSONの一致を照合。旧方式の固定4T結果と再生、新方式通常ターン/図鑑保存の公開ガードも確認する。

## 追加発見・修正

共有光の温度/pH補正が蓄えの不足量だけに作用し、受光より不足量が大きい場合に実光合成量を制限できていなかった。実受光量に対する利用上限へ修正した。植物共生の採食・維持へ植物係数を一律適用していない。

また、新方式の一般主生物要求をそのまま使うと、植物共生体にも植物/菌食が許されていた。既存の採用食性へ接続し直した。他系統全体の食性や能力値を今回一括変更していない。

## 有効条件・無効化と残件

[source-hashes.json](source-hashes.json) の生成元/生成物・検査・関連文書と生態署名を対象とする。[final-check.json](final-check.json) はCore/A/B・61Nodeの正式状態/Graph・Manifest一意性・ログ/生成署名の照合結果。旧方式の再生別名は `cellModel` 未指定に限定する。

受光/環境係数・水消費・共通需要・移転順・食性・資格時点または関連ソースを変えた場合、該当証跡の再評価が必要。未選定の水系値を陸上値で補っていないことも限定境界として確認している。

水系の専用値/淡水生活、専用樹冠係数、群落移動の対象種/再生枝、観測/設定/表示/保存の公開とCR07代表長期は後続。全テスト・自然P/Q多世代循環・500T/R1〜R6・性能・画面・Windows/配布は今回の確認対象外。
