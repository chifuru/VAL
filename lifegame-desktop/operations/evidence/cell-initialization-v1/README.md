# CR06：実初期配置・身体と占有の限定証跡

起点 `760ab68`。C7/C7.1/C8.2、D7 → E5。対象 `cell-reorganization/1` と明示 `freshwater-comparison/1`。契約は [作業計画](../../plans/cell-initialization-v1.md)、上位は [C/D契約](../../../design/implementation/cell-reorganization-v1.md)3.3節。Core/A/B、正式61Nodeの草案/Graph、製品4.2.77・既存UI/画像・配布は変更しない。

## 結果

新しい初期化6項目と観測記録7項目が成功。既存基盤8項目は7成功・1文言不一致。全21項目成功とは扱わない。

| 実行 | 結果 | 証跡 |
| --- | --- | --- |
| `node --test-reporter=tap tests/cell-initialization.test.cjs` | 6成功・0失敗 | [initialization.tap.txt](initialization.tap.txt) |
| `node --test-reporter=tap tests/cell-observation-units.test.cjs` | 7成功・0失敗 | [observation.tap.txt](observation.tap.txt) |
| `node --test-reporter=tap tests/cell-space.test.cjs` | 7成功・1文言不一致 | [foundation.tap.txt](foundation.tap.txt) |
| 起点mainとの旧方式比較 | 2条件×T0〜T2の全世界JSON・観測・CSV一致 | [legacy-parity.json](legacy-parity.json) / [比較入口](legacy-parity.cjs) |

基盤の末尾では、旧4Tの指紋・統計・不変条件・旧記録の再生は成功した。旧記録へ新しいマス方式を偽装する負例は、署名比較より前の観測データ検査で拒否され、期待する「計算版が異なる」と異なる文言になる。起点の生成物・`archive.js` でも同じ拒否を確認し、既存の期待値は変更していない。今回の回帰・旧記録の再生失敗へ読み替えない。

## 照合範囲

- 初期配置専用の一時索引で、異層の共存・同層の空きを処理。低次6/高次3/低次動物5/菌6、主生物の定住3枠を守る。淡水光合成体は主生物と4次を共有し、満員なら配置しない。量機を勝手に相変異にしない。
- 指定数が適地のマス数を超えた場合も、合法な空き枠を使う。実IDを重複させず、主生物の自然/散在/集中の3配置を確認。明示0・指定人数を保持し、容量を増やしただけで自動初期数や小集団人数を倍増しない。
- 低次植物の初期可食率は新上限20Bへ適用。旧可変容量80Bが残る入力でも、実身体12B・身体M0.24という比較値へ確定し、旧初期化で再上書きしない。初期台帳は最終の全所有物を一度だけ計上する。
- 世界内の下層要約を `cell-population-observed/1` とし、管理数/人口・重複排除した占有マス・実B/基部/可食部/可食上限・自由E/M/身体Mを実体から読む。菌の33群落について、旧容量396Bではなく現行の可食上限99Bを記録する。旧生活型の生産/再生履歴を流用せず、要約呼出しで世界や乱数を動かさない。
- 40×28河川世界の463管理単位を実生成し、T0〜T2の内部生活でE/M保存・枠・実P/Q所有を照合。生成元/生成物・Worker差分/JSON・全T観測の復元が一致。主生物は84→89体、低次動物は111→107体。2Tの結果であり、長期存続の認定ではない。
- 候補設定から手動生成へ接続し、解決済み初期条件から全身体・枠・指紋を再生成できることを確認。これはゲーム図鑑への保存・最終ターンまでの再生成功を意味しない。
- 旧方式の2条件は起点mainと全状態・観測JSON/CSVが一致。新しい計算署名から旧署名への互換は `cellModel` 未指定の場合だけに限定する。新方式への旧署名流用、通常 `beginTurn`、ゲーム図鑑 `capture` は引き続き拒否する。

## 対象と限界

生成元の `state.js` に加え、実行モデルが初期配置へ差し込む `design/renewal-screen-v2/allocation.txt` も接続した。生成物は `tools/build-observation-model.cjs`、署名は `tools/update-replay-version.cjs` から再生成。8プロファイルの生成整合は [generation-check.txt](generation-check.txt) を参照し、8条件の長期検証と混同しない。

[source-hashes.json](source-hashes.json) の対象に対する限定証跡。[final-check.json](final-check.json) はCore/A/B・正式Node/Manifest、生成署名・各結果の出力前照合。初期配置・実ID・身体/容量/台帳・要約・転送形式・再生互換を変更したら、該当部分を再確認する。

ゲーム図鑑の保存/再生、通常ターン公開と連続操作、未選定の群落移動対象種/専用樹冠係数・再生枝、CR07代表長期・性能・Windows/配布は後続。今回、画面を再撮影せず、500T/R1〜R6/全系統・自然P/Q多世代循環の達成を報告しない。

比較の再実行前に、`git show 760ab68:lifegame-desktop/src/ecology/observation-modules.js` と同起点の `archive.js` を、それぞれ `/tmp/cell-initial-old-modules.js`、`/tmp/cell-initial-old-archive.js` へ展開する。`node operations/evidence/cell-initialization-v1/legacy-parity.cjs` で照合する。入力ファイルは引数で指定可能。
