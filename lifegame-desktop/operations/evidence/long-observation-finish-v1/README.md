# 第7項目・長期高速観測の仕上げ / 1

基点main ea0becc、app4.2.74、2026-10-23、Linux Chromium。契約: `design/specification/long-observation-finish-v1.md`。計画: `operations/plans/long-observation-finish-v1.md`。

## 変更

旧個体数図のpopulationHistoryは宣言/世界初期化/追加以外に参照されず、現在のグラフや保存では利用していなかった。この7行だけを削除。表示された新しい時点ごとの未使用オブジェクトと、世界を作り直すまで増え続ける配列保持を廃止する。現在の3グラフ/サマリは既存observationsから描く。全確定Tの正本、累計出生/死亡、保存/再生/乱数/生態/画像は変更なし。`source-audit.json`で全参照と削除範囲を照合した。未使用の他変数まで整理する変更は含めない。

## 今回の限定確認

- `LIFEGAME_EVIDENCE=operations/evidence/long-observation-finish-v1/speed node tests/observation-speed-ui.cjs`：18項目成功。実Workerで2倍から途中切替、最速の強制軽減/予熱予約破棄/記号化なし、確定T13で14行保持・盤面/グラフT10・停止時T13へ同期、逐次生態fingerprint一致を確認。個体選択/グラフ対象/別画面の端数反映、元の表示チェック・ラベル復元、基準速度への再開も確認した。`speed/report.json` / `speed/speed-controls.png`。
- `LIFEGAME_EVIDENCE=operations/evidence/long-observation-finish-v1/live node tests/graph-scale-cache-ui.cjs`：10項目成功。実旧app（実行時HEAD=ea0becc）と新appのT3・主/全生物/生産者を比較。4Canvas画素/軸/ラベル、関係SVG、全行/fingerprintが一致。`live/report.json`。

長配列復元の30万行fixture、長期グラフの全点/最大値、詳細/非表示の証跡は各対象版の既存証跡を維持し、今回再実行したものとしない。今回の実観測は小世界・限定T数であり、500T/実2万T/最大メモリ/総合速度倍率/全件回帰/Windows/配布の認定ではない。全点グラフの描画コストと長期記録の有限容量・一括復元cloneは残る。

## 今回の7単位の区切り

現在の対応表: `operations/plans/improvement-status-v1.md`。ドーナツ切替、画像漏れ、設定導線、長期グラフの重複走査、詳細配置共有、非表示欄、今回の速度・旧履歴整理をそれぞれの限定範囲で対応済みとする。範囲外のピラミッド切替/関係指標の再設計/資源地形強調/要因色分け/生態近似を完了扱いしない。

正式61Nodeは草案を維持。承認状態遷移なし。次は利用者の実画面確認で得た問題への対応。配布は別指示時のみ。
