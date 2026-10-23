# 追加発見・長期観測記録の復元 / 1

基点main ee5bd53、app4.2.72、2026-10-23、Node v24.19.0 / Linux。計画: `operations/plans/long-record-restore-v1.md`。結果: `report.json`。

observations.restoreは検査後に全観測行をpushの引数へ展開していた。有効な300,000行の互換観測fixtureで旧処理のRangeErrorを再現。変更は一括structuredCloneを維持してその結果を行順に1行ずつpushする箇所のみ。入力からの分離と記録内の参照共有を維持する。全行/全T/値・容量検査・読取専用・CSV/保存形式/生態/描画は変更なし。

`tests/long-record-restore.test.cjs` 3試験成功。実restoreの検査も省かず、300,000行の全turn/count、読取専用、内部共有参照と元記録からの分離、小記録の全系列/スナップショット/CSV一致を確認。比較版は問題の旧式を現在ソースへ戻して生成し、その全バイトがee5bd53の実ソースに一致することも照合。テスト自身はGit履歴を必要とせず、浅いcheckoutでも実行できる。

既存 `tests/record-budget.test.cjs` 6試験も成功。期限切れ詳細の容量計算・拒否の原子性/再試行・行単位の正確なUTF16境界・全履歴JSON文字列化の回避・非有限値/入力不変・有限容量上限を限定回帰。

fixtureは7種類の観測値を周期的に持つ最小互換記録で、実世界を300,000T動かしたものではない。既存の一括cloneは残る。実1GiBファイル/最大メモリ/ブラウザ実画面/全旧版/Windows/配布は未認定。総合高速化率を報告する変更ではない。正式Nodeは草案、中断中の3速度/10T描画は未採用。
