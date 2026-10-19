# 最終状態・全期間記録と再生後の明示保存 — 4.2.15

schema2で初期/実効条件、最終統計/収支/出生死亡、全確定ターン原値、指標定義版/保存時の系統名と分類を保存。record IDと生態fingerprintを分離し、元記録を残した再生後の明示保存だけ新規記録にする。自動再生終了は増件しない。

新記録はIndexedDBへ本文/ヘッダを単一取引で保存。旧localStorageを移動せず併読。結果分析は保存された基本3パネルを読み、ライブへ書き戻さない。旧グラフ欠落は欠落のまま表示。初期設定からも図鑑を開ける。保存失敗時は保留結果で再試行でき、JSONを出力できる。

## 実測

- 新単体5件：schema2/全原値とCSV・指標版・保存時分類・独立ID/親参照・暗黙再保存禁止・欠測/不正値/異版拒否・合成501時点の古いピーク/描画集約・保存失敗の旧データ保護（new-unit.log）。
- 旧archive単体4件維持（legacy-unit.log）。関連5テストファイルの回帰：archive/history/current-summary/ecology-observation/initial-supply（regression.log）。
- Linux Chromium40項目、実IndexedDB：新旧併読、ページ再読込、全期間グラフ/CSV/JSON、参照時点、別のライブ世界との独立、schema2再生指紋一致、自動保存なし、明示的新規保存/元記録不変、quota時のヘッダ/本文全ロールバック、再試行、合計100件/明示削除、破損旧データを上書きしない、狭幅、通常dialog/pageerror0（ui-report.json）。
- 別IndexedDBへ合成501時点を保存し再読込一致（history501.json）。約340万文字、UTF-16推定約680万バイトの記録。これは実際の生態500T試験ではなく、既存集計形式を複製した輸送/保存検査。
- 既存observation-model実画面8項目：全8優遇×2Tの実Worker/同期一致と、非同期保存後の再生・暗黙保存なし（model-ui.log / model-ui-regression）。Windows CIの既存保存検査も保存完了を待つ形へ接続。
- 原画35PNG・主21系統183枝の参照整合（assets.log）。生物/背景の造形変更なし。
- Windows4.2.15生成とソース/原画同梱一致（package-report.json / package-match.json）。実Windows起動は未実施。

analysis.pngは実装画面。saved-turns.csv / saved-result.jsonは3Tの実観測からの書出しで、合成501時点とは分離する。source scopeはscope.jsonで照合し、生態source/再生署名/core不変を確認する。

## 限定範囲

新しい生態係数・500T存続率・全系統バランスの認定は行っていない。実Windows起動、多数/長期間記録時の端末性能、未知の指標版からの変換は未確認/未対応。上限100件と実端末の保存容量は別で、保存失敗時も既存記録を消さない。JSONは書出しのみ。種別/PQ初期数・生態/最終外観/性能の残件は継続する。

正本: design/specification/archive-history-v1.md。契約: operations/plans/archive-history-v4.2.15.md。既存NodeとManifest現在要約へ反映し、正式状態は草案のまま。core変更・新Node・初期登録・承認状態変更なし。
