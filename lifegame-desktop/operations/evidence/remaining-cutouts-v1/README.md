# 残る切り抜き経路・主生物の画像枠 / 1

基点main 88d9d88、app4.2.74、2026-10-23 UTC。承認済み7単位の2。契約: `design/specification/remaining-cutouts-v1.md`、計画: `operations/plans/remaining-cutouts-v1.md`。今回の確認と限界は `report.json` / `matrix.json`、修正前は `preflight-summary.json` / `preflight.json`。

主生物基本相・専用分岐・下層・地形小物303領域の透明画素を確認し、空画像/不透明背景矩形は0。実描画は主生物21系統のI/III枝/最終相へ雌雄/年齢を組み合わせた63状態、下層7種2相14状態、小物16、旧P/Q3の96状態。元資料の背景は表示素材と混同せず、地表面そのものは透過対象にしていない。

追加発見: 詳細画像の実枠384×300相当で、jelly I/IV、crystal I、abyss I、gravity I、precocial Iの6状態が下端へ接触し切れていた。主生物のdrawPortraitが幅だけを基準に半径を決めていたため、縦横の短辺を基準にする1式だけへ修正。正方形枠の倍率は不変。smoke用APIで同じ実関数を直接確認できるようにした。盤面の描画関数/採用素材/生態は変えていない。

修正後 `tests/remaining-cutouts-ui.cjs` は11項目成功。303素材領域に背景矩形なし、96描画は透明な輪郭・余白を持ち、端欠け0、入力/実世界指紋は不変。実際の主生物/一次消費者の選択詳細と主生物系統樹も確認した。ブラウザ例外/外部通信0。`examples.png` は実描画の代表画像をまとめた確認資料で、新デザイン案ではない。

P/Q・三独立植物・量機の既存68状態の証跡は `operations/evidence/inspector-cutouts-v1/README.md` の範囲で維持し、同じ試験を再実行したとはしない。今回は全系統×全分岐×雌雄×年齢の直積、全アニメーション/全端末/Windows/高DPI/長期生態/配布を認定しない。全体の対応状況と今回の作業順は `operations/plans/improvement-status-v1.md`。正式61Nodeは草案を維持する。
