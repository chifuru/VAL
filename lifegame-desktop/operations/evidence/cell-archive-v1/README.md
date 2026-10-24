# CR06：マス再編の図鑑保存・再生条件の限定証跡

起点 `7062aa8`。C8/C8.2、D9 → E6。契約は [cell-archive-v1](../../plans/cell-archive-v1.md)、上位は [C/D契約](../../../design/implementation/cell-reorganization-v1.md)6節と [A/B正本](../../../design/specification/cell-reorganization-v1.md)12節。

## 結果

**新しい保存6項目、旧保存9項目、Linux画面19項目が成功。** 生態ソース/生成物・計算署名・Core/A/B・正式61Nodeの草案/Graph・画像/既存画面構成・製品4.2.77・配布を維持する。

| 実行 | 結果 | 証跡 |
| --- | --- | --- |
| `node --test-reporter=tap tests/cell-archive.test.cjs` | 6成功/0失敗 | [unit.log](unit.log) |
| `node --test-reporter=tap tests/generation-archive.test.cjs` | 9成功/0失敗 | [legacy-generation.log](legacy-generation.log) |
| `node tests/cell-archive-ui.cjs` | Linux Chromium 19項目・未捕捉エラー/通常ポップアップ0 | [report.json](report.json)、[browser.log](browser.log)、[保存結果画面](saved-result.png) |

## 接続と確認内容

- `archive.js` から既存C8.2の補助実装 `cell-archive.js` へ、新方式の保存/全本文検査だけを接続。schema3の外形を保ち、`cell-ecosystem-terminal/1` / `cell-terminal-stock/1` と `cell-occupancy-observed/1` を明示する。旧方式は従来の保存経路を維持する。
- 全実効設定・解決済み初期条件・全T集計原値・最終指紋/収支/人口を保存。固定環境と最終の土壌/水分/腐敗負荷・有機物/次T待ちは一度だけ保持。各分類最大4の有限例へ、実身体/身体M・群落生活・内部世代・定住/移動・量機状態を保持する。全個体の毎T世界スナップショットは追加しない。
- 河川40×28・主生物84体、陸水の下層とP/Qを含む実生成世界を内部2T進行。JSON保存/読込・全期間観測の復元と、保存した初期条件から同じ2Tを再計算した最終指紋・在庫・系列の一致を照合。新記録へ旧署名を流用しない。
- 欠測/未知版、環境・水分/養分/利用待ち、身体/コホート/占有、P/Q遺伝設定、人口単位・最終集計の改変を保存/読込/再生入口で拒否。失敗しても元記録・保留ID・現在世界を保持し、再試行で保存できる。未選定水域はnullのまま保存する。
- 再生準備で固定環境を照合し、相違があれば現在世界を置き換えない。単なる再生では保存数を増やさず、明示した新規保存だけ別IDと元記録IDを持つ。T0で終了した途中再生も別記録として保存でき、元のT2記録を保つ。
- 実ブラウザのIndexedDB本文/ヘッダ、全期間3グラフ・相/雌雄/年齢・生物量ピラミッド・円グラフ・最終詳細を確認。軽量ヘッダへ全期間/最終在庫を載せず、必要時だけ本文を取得する。壊れた本文の読込で世界を変更せず、正しい本文を戻すと再読込できる。

## 有効範囲と後続

[source-hashes.json](source-hashes.json) の実装・検査・文書と同じ対象に限定する。[final-check.json](final-check.json) はCore/A/B・正式Node/Manifest、既存生態/素材/レイアウト・署名と実測結果の出力前照合。

これは内部2Tの保存/読取・決定的再計算と、停止した画面での図鑑操作の接続である。新方式の通常 `beginTurn` と設定画面の送信ガードは維持する。自動で動く再生・全速度/連続操作・500T/R1〜R6・全系統/自然P/Q多世代・性能・Windows/配布の完成ではない。通常ターンの接合/公開条件、未選定の群落移動対象種/専用係数とCR07は後続。

保存形式/定義/数量/サンプル・状態検査、初期生成との照合、保存/読込/明示保存、本文/ヘッダ/結果画面を変更したら該当境界を再確認する。前工程の生態検査や既存固定ハッシュ不一致を今回再実行・解消したと扱わない。
