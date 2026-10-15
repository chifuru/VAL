# 特化分岐と生態の実画面確認

対象commit: b5758a4ae1035cc2e0b6a4ae158826c979075bd2 / app1.12.0 / revision4。
確認主体: Codex cloud、2026-10-15。生成した実描画を表示して目視確認。

- finish/N893-phase-progression.png、N847-phase-progression.png、N932-phase-progression.png: 同じ新rendererで旧1.11.0状態と新状態を579/580/620/700/800行で比較。背景の旧新版比較ではなく、外見計算・継承の比較。N893は第三相入口で橙色の別輪郭へ交換せず、元の翼/浮遊節を保って徐々に特化する。N847も頭・胴・触手のつながりを保つ。N932は神鳥の羽・脚・尾を維持する。
- art/habitat-gallery-1〜4.png: 20実成熟個体に4純生息地の光/背景を適用した80制御場面。分類名と元のsource系統が異なる場合がある。20sourceを無条件に差し替える仕様から、20方向の特化へ変更したためで、元sourceはthird/fourthでも同じ祖先系統の成長コマを使う。
- motion/gesture-myth-fizz.pngとfinish/living-habitats.png: 元の顔・陰影・輪郭を保った食事反応と環境光。情報の光は硬い矩形境界を避けて柔らかい斜光とし、小生物の深度に合わせて大きさ/色を整えた。
- 小生物の色調は、初期の個別Canvas方式が既存の初回生成上限に抵触したため、48タイル/1表示アトラスへ変更。24sourceを一度合成して2深度帯へまとめて色調処理する。性能上限のテストを緩和していない。warm生成ゼロ、実特化区間131行も計測済み。

material-comparisonの旧1.5.1/新版対は、材質だけを比較するためspecializationを無効化する。他の実個体/生息地/動作検証では有効。全160sourceセルの口先/接地検証は、別途sourceを明示指定した網羅fixtureであり160個体の育成完走ではない。
4本の動画はvideo-inspection.jsonで復号・frame数・PTSを確認した。静止画の確認は実機動画の美術受入の代替ではない。

利用者Windows10/11実機の倍率/FPSと美術受入は未実施。初回の素材/反応準備には一時負荷が残り、直接CPU測定とGPU表示/FPSを区別する。
