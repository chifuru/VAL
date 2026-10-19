# 近景照明キャッシュ・寄生除去接続 — 4.2.25

対象3a61c04/4.2.24→4.2.25。標準coreの関連節を実読し、既存C8/C8.1/D9/E6と配布C4/D4/E7のFLOW-04→05内で実施。新Node・承認状態変更なし。検証契約: operations/plans/update-performance-v4.2.25.md。

## 原因と変更

同じ河川225Tの状態と過去225Tまでの履歴を私有試験へ導入し、通常Workerの225→230Tを関数別時間/CPUプロファイルで調べた。更新patch適用、setWorld、観測/グラフ更新に比べてdrawが支配的。before/cpu.json.gzとrestore-attribution.jsonでは約37.6秒が主生物描画内のCanvas restoreに帰属した。主生物へ毎描画かけるbrightness/contrast/saturateが大きな描画面のフィルター処理を起こしていた。

同じ色補正を不変スプライトごとのWeakMapへ一度だけ焼き込む。姿勢・向き・カメラ・影は既存の描画を使う。素材や個体/ターンを削減しない。通常再生の行動段階にも実clearを渡し、寄生除去の既存モーションを表示する。除去の成立条件/費用や生態ルールは変更しない。

## 限定比較と回帰

- 同じ225→230T: draw累計38,286.4→908.2ms、試験全体54,446→13,863ms、生態指紋一致。comparison.json。CPUプロファイルと試験の状態取得負荷を含み、旧版試験の一部は別の短い除去確認と重なる。一般的な速度倍率や制御されたハードウェア比較とはしない。0〜500Tの証明でもない。
- 旧3a61c04との全21主系統×2姿勢、代表III相/枝/雌雄/年齢の42ケース。暗色背景へ合成後、前景画素のRGBA平均誤差は最大0.829階調、16階調を越える差の画素率は最大0.410%。実寸比較図visual/comparison.pngを実見。全相/全枝/全背景の外観承認ではない。
- 実Workerで維持負荷によるclearを起こす固定初期状態。旧版は実除去・原子的結果一致を満たすが、行動段階の表示で失敗。clear-before/result.json。修正後は4項目通過し、実除去・行動段階のclear描画・原子的生態指紋一致を照合（clear/）。
- death-motion-ui 37項目、primary-plane-ui 22項目を通過。motion/、plane/。既存の死亡時状態、採食/攻撃/防御等、相分離/選択/宿主追従、Worker一致を限定照合。
- Windows4.2.25生成、全72ソース/35PNGの同梱一致。package-match.json。生態処理（art/renderer以外）とPNG素材は不変、scope.json。実Windows起動は未確認。

## 通常速度500T

同じ自由設定/河川40×28/主80/供給OFF/3優遇ONを、実Worker・3段階・既定速度で0〜500T運転。100Tから近景、200Tから主分離、300Tから近景記号、400Tから遠景へ変更。15項目通過。full-run/report.json、timeline.json、最終画面final-500.png、保存分析saved-analysis.png。

- 開始ボタンから保存分析/出力照合まで約766.4秒（12.77分）。生態500T到達時間はsamplesの最終時点を参照し、保存操作を生態ターン時間へ含めない。
- 200→225Tは約48.945秒。前回の同区間157.772秒との参考比較。監視処理は軽量化したため、照明変更だけによる厳密な単独効果の倍率とはしない。
- 501行/連続ターン、現在サマリ500T、最終統計と生態指紋が独立の計算監査off.jsonに一致。生態指紋は表示や速度へ依存しない。
- 図鑑へ実IndexedDB保存→最終分析→全期間原値JSON出力→ライブへ復帰を照合。全原値history.json.gz、保存記録saved-result.json.gz。独立計算監査の全501行とも一致（history-comparison.json）。再生を500Tもう一度行ったものではない。
- この1初期値/1地形/供給OFFの確認を、全系統の生存率や供給ON/全地形の画面性能の保証にはしない。既知の情報/菌膜/水中生産者の未達や密集札/背景継ぎ目、死亡済み行為者の動きは残る。実Windowsも未確認。

## 再実行

プロジェクト直下で `node tools/build-render-profile.cjs` が私有225T状態をworkへ生成する。`node tests/update-performance-ui.cjs` は当該状態と既存監査の履歴接頭辞を使う（出力先はLIFEGAME_EVIDENCEで指定）。`node tests/clear-motion-ui.cjs`、`node tests/cached-lighting-ui.cjs` が実Worker除去と旧版画像比較。通常速度の長期試験は `LIFEGAME_EVIDENCE=artifacts/rendered-circulation node tests/rendered-circulation-ui.cjs`。図鑑は試験用の私有ブラウザ領域へ保存する。

試験側は通常再生を短縮せず、軽い私有進捗読み取りを約1秒ごとに行う。旧監査の全world snapshotの反復複製を避け、監視自体の負荷を抑えた。最終時点では完全状態と履歴を取得する。
