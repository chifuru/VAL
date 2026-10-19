# 生態処理・ゲーム内説明の限定照合（4.2.17）

基準f62b882（4.2.16）。プロジェクト標準配置のcore関連節をOperation→Summary→Flowの順に読み、既存B5.2/C8、D8/D9、E5/E6へ接続。FLOW-04/05の範囲。新Node・正式状態変更・生態係数変更なし。

## 修正

旧説明の同一餌枠を生産者/分解者・一次消費者・主の3枠へ、単一行動の説明を移動後の作用再選択と独立採食へ修正。生産者供給と外部台帳・出生CAの優遇差・浮遊微藻・水游虫優遇の長寿を説明。P系統樹の「III以上」を年齢成熟へ修正。Q成長を優遇ON/OFFに連動し、説明と系統樹で共用。実初期探索数/種別指定を表示し現在数と区別。主系統の雌雄差も既存固有描画の説明へ合わせる。

## 実測

- 製品モデルで固定6地形×3寸法×2初期値、36条件の既定陸路/水路の全辺が合法（model-report.json / tests/ecology-guide-model.cjs）。主は深水にも有限移動費。岩塊/壁/角抜けは従来判定。全陸域・全孤島の接続保証や自律個体の渡航成功率ではない。
- 高次寄生優遇ON/OFFの製品2profileで、成熟I相の繁殖候補、幼体IV相の候補外、Q感染窓matureAt+1〜+3だけ、Q成長1+2回/E0.02と4+8回/E0.2を実処理で確認。
- 既存5テストファイル通過（regression.log）：ecology-reproduction / ecology-parasites / parasite-contact / staged-turn / observation-model。情報の鮮度/文脈/Q作用とDNA不変、感染移行、繁殖、3段階と原子的進行、製品8profileの比較を含む。新500T認定ではない。
- Linux Chromium32項目（ui-report.json）：3枠/供給/独立行動/渡河/水中生産者/成熟/情報説明、Q優遇ON/OFFの説明・系統樹、P年齢成熟、手動初期Q2群体の実数、説明操作前後の世界指紋不変、観測グラフへの復帰、狭幅、通常dialog/pageerror0。
- parasite-guide.pngは実装された説明シート。新しい造形モックではない。
- 変更srcはIndex.html（版表示）とapp.jsのみ。生態全source/生成済みprofile/再生署名と35PNGは基準から不変（scope.json）。静的profile再生成一致・主21系統183枝の参照整合も確認（assets.log）。
- Windows4.2.17生成、変更src2ファイルと35PNG同梱一致（package-report.json / package-match.json）。実Windows起動は未実施。

## 残件

工程8の全完了とはしない。要所占有の実効利益/観測、陸水の世代循環、情報/Qの実作用とグラフ集計の照合、必要な陸域接続の範囲を引き続き確認する。新500T・最終密集外観/端末性能・実Windowsは未確認。生態の不整合が見つかれば必要差分だけ修正し、説明を実装の代用にしない。

正本: design/specification/ecology-guide-v1.md。実行契約: operations/plans/ecology-guide-v4.2.17.md。Node/Manifestは現在実態へ反映、正式状態は草案。
