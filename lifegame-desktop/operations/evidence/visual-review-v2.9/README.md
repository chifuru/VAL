# 遠近の代表比較・優遇の独立切替

契約: operations/plans/visual-review-switches-v2.9.md。2026-10-19 JST。製品4.1.3/src/core/素材は未変更。

advantage-tests.logの3検査で全8組合せの初期設定・短期収支（各0〜3Tの32状態）、全ON/全OFFの各0〜3T世界一致（advantageSettingsだけ除外）、型/未知キー/再生設定不一致の拒否を確認。初期QはON128/OFF4（40×28河川）、水游虫の寿命はON600/OFF40、生産者の寿命も個別に反映。独立したOFFが他の優遇を強制変更しない。全ONは既に500Tを観測したfavored-free/3と物理状態が短期一致。混合OFF条件の500T試験は未実施で、長期保証はしない。

report.json/capture.logはLinux Chromiumの7確認。遠景の記号パス/色/描画関数がbyte同一、同じ表示倍率、左右の世界指紋一致、近景fixtureの個体/年齢/相/雌雄一致、表示変更前後で生態指紋不変、元素材/体型不変、ブラウザ例外・ネイティブdialogなしを確認。元の7確認はすべて可読性のユーザー承認とは別。

画像はdesign/visual-review-v2.9/01-far-comparison.png / 02-near-comparison.png。近景は主生物6体を実地形へ明示配置した表示fixture。自然進化の証跡ではない。撮影用に盤面を大きく抜粋し全体UIの配置変更案とはしていない。優遇checkbox欄は配置の試作であり、製品のWorker/生態/記録へ未接続。図鑑や最終グラフの完成もこの比較の対象外。

目視で2画像を確認し、全6代表個体の絵柄が維持されたこと、主生物の囲みを除いたことを確認。方向の採否、全種/全状態/密集とモーション/複数画面寸法、表示起伏に対する選択操作の結合確認は後続。今回の画像だけで全視認性/背景の立体感が合格としない。

report.jsonに描画ソースと試作のhash、source-hashes.jsonに切替モデル/検査のhash、structure.logにNode/参照/core不変検査を保存。新Node/初期登録なし、既存Manifest反映。次は利用者の方向確認と、優遇設定・生態・UI/記録の製品接続。
