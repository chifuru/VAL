# 初期量・生産者の環境供給 — 4.2.14

自由設定でも生産者供給を選択。新UIはON、旧条件の欠落はOFF。陸/水の栄養・支援地点率・再生を独立調整。下層3群の初期密度・散在/集落、鉱物/水分/情報の初期量を指定。実効条件/調整あり/目標と実配置を表示しconfigへ保存する。種別/PQの初期数指定は未接続で、群の密度指定の達成と区別する。

既存比較モデルの供給処理を共通state/engineへ接続。比較用model入口も共通hookを使い、二重適用しない。深水では有効な浮遊微藻も候補にする。初期量を増やすだけではなく、設定された生産者基盤の有限更新を許す。環境定着は新ID/環境由来を持ち、通常出生と別集計。動物/寄生虫の救済補充なし。外部E/B/Mは収支へ一度だけ計上し、初期台帳を書き換えない。生産者無効群からは発生しない。

## 確認した範囲

- 新単体6件：初期密度/0資源/分布の再現、設定拒否/配置不足、供給ON30Tの収支と再現、欠落/OFF/無効群、初期条件の保存再生、旧署名に新設定を混入した記録の拒否（new-unit.log）。
- 供給8件：有限範囲/攪乱区間、外部台帳の保存/破損検出、供給停止と回復、新ID/由来、動物・寄生虫を発生させない（supply-unit.log）。
- 既存回帰5ファイル：archive・compute-worker・ecology-observation・observation-model・producer-supportが通過。regression.log。実Workerの差分復元と静的8モデル照合を含む。
- 供給/初期量を持たない旧条件：8優遇×30Tの生物fingerprint・stats一致（model-report.json / legacy.log）。既知3旧署名は旧設定に限り互換、未知署名拒否。新設定での生態規則が旧版と同一という意味ではない。
- Linux Chromium24項目：新規ON/旧OFF、陸水/密度/0情報、実配置/調整あり、既存グラフ4canvas、実Workerと同期の完全一致、取消、入力失敗、再試行、狭幅、pageerror/通常dialog0（ui-report.json）。setup.png / screen-active.pngは実画面。
- 原画35PNG/主21系統183枝の参照整合（assets.log）。造形・遠景記号・背景の変更なし。
- Windows4.2.14生成、変更ソース10ファイル/原画35PNGとのバイト一致（package-report.json / package-match.json / scope.json）。実Windows起動は未実施。

## 残件と境界

種別/PQの初期数指定、稀な供給攪乱のUI、全期間の図鑑保存/再保存は残る。新規500Tの存続確認・成功確率・全環境のバランス認定・最終端末性能は実施していない。既存の500T事例を今回の供給ON全条件の成功へ流用しない。供給なし旧条件の計算一致と、新機能の限定検証を区別する。

A/B正本はdesign/specification/initial-supply-v1.md。契約はoperations/plans/initial-supply-v4.2.14.md。core読込専用、既存Node/Manifestの現在要約へ対応を反映し、正式状態は草案のまま。新Node・初期登録・承認状態変更はない。
