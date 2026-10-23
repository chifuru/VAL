# 第4項目・長期グラフの重複走査軽減 / 1

基点main e8f36ad、app4.2.74、Linux Chromium、2026-10-23。契約: `design/specification/graph-stack-work-v1.md`。計画: `operations/plans/graph-stack-work-v1.md`。

## 変更

paintStackで横座標を各時点一度だけ求め、全系列で共有する。下辺を描く逆順走査で積み上げ基準値も更新し、別途の全履歴更新走査をなくす。値の加算順序/全頂点/描画命令は維持する。局所作業配列は横座標と基準値各1本（Float64、計16×時点数bytes）で、系列ごとの複製/永続キャッシュは増やしていない。全点描画のO(T×系列数)は残る。

## 限定確認

- `node tests/graph-stack-work-ui.cjs`：53項目。旧実関数と新関数のCanvas命令/画素/ラベルが一致。空/1点/欠値・0/新系列/微小値・大きな値/共通最大値/低い枠/高DPIの代表と、再描画/追記/短縮/別系列を比較。凍結入力も書換なし。`report.json`。
- `LIFEGAME_EVIDENCE=operations/evidence/graph-stack-work-v1/live node tests/graph-scale-cache-ui.cjs`：10項目。実小世界T3、主生物/全生物/生産者の3対象。4Canvasの画素/軸、関係SVG、全行、生態fingerprintが基点と一致。比較時HEAD=e8f36ad。`live/report.json`。
- 20,001時点・20系列の横座標用turn参照は800,040→20,001（40分の1）。別の積み上げ更新走査は20周省略。ただし値参照/全頂点描画は残す。
- 初回の計時はgetter計数付き・実UI比較と同時の探索計測であり、速度評価には使用しない。`--benchmark-only`で通常の数値レコードに替え、他の確認実行を終えた後に5組交互で限定計時。中央値1288.8→1259.3ms（約2.3%差）。`timing.json`。単一環境の合成Canvas描画であり、統計的な性能保証/生態ターン速度/アプリ全体の倍率ではない。大幅な時間短縮は確認していない。

生態/乱数/保存/原値/全点/グラフ配置/色/素材は維持。全件回帰/実2万ターン観測/Windows/配布は未実施。61正式Nodeは草案のまま、承認状態遷移なし。次は承認済み第5項目の詳細/追跡の重複計算。
