# I09 観測画面の実測

最終ソースで `I09_LAYOUT_PREFLIGHT=0 LIFEGAME_EVIDENCE=operations/evidence/i09-observation-interface-v1/ui node tests/i09-observation-interface.cjs` を実行。Linux Chromium、1460×1030と780×1000。**58項目成功・例外/通常ダイアログ0**。[原値](ui-report.json)の生態署名は `a7cac02a9d7382b478919b40c44823ce0d6bb0325b3e551adb1236908c92774d`。配置条件を保留した途中のpreflight結果は含めない。

標準画面ではサマリ約313px、マップ約256px、個体数グラフ98px、相/雌雄/年齢グラフ各38px、生態関係76px、円250×212px。上部の一体サマリ、マップ、右の3グラフが同時に見え、個体選択では独立した横詳細が加わる。狭幅では縦配置となり、横はみ出しはない。以下の5画像を実見した。

- [標準画面](interface-standard.png)：地形描画後の遠景と常設3パネル。
- [近景と横詳細](interface-near.png)：採用画・背景、グラフと独立した個体説明。
- [初期表示](interface-layout-preflight.png)：同じ正式実行内の最初の寸法確認。ファイル名にpreflightを含むが、途中runの流用ではない。
- [狭幅](interface-narrow.png)：780px幅の縦配置と全3パネル。
- [保存結果](interface-saved-result.png)：保存した4T結果の一体サマリ。下方の全期間グラフ・数値/CSVは同ダイアログ内で参照できる。

分類別/系統別の対象選択、不要欄撤去、最大/個別/通常設定、近景原画の維持、名札の同期、低頻度描画と停止/選択時の最新表示、IndexedDB保存/分析、旧記録の欠測表示/再生を確認。通常/最大/個別の実際の4T計算で、世界指紋と全ターン原値が一致した。

100/101/400/500/501Tの上1/下4配置は、既存の実測行を複製した**表示専用の境界fixture**で確認した。500Tの自然な生存・創発や性能の実測ではない。P/Q長期循環・最終素材・Windows配布の認定には使用しない。通常停止/遷移の別検査と全体照合は、親ディレクトリの最終証跡を参照する。
