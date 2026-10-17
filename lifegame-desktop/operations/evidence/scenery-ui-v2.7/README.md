# 地表・地物・観察画面 v2.7の限定証跡

app2.7.0 / painterly/1 / Linux x64 / Node24.19.0 / Chromium154。契約は[scenery-ui-v2.7](../../plans/scenery-ui-v2.7.md)、判定と未達は[validation.json](validation.json)、実体は[source-hashes.json](source-hashes.json)。モックとの最終一致・UI全体完成・生存バランス完成を意味しない。

## 同じ通常配置・同じターンの実画面

- [遠景・画面全体](scenery/natural-far.png) / [盤面のみ](scenery/natural-far-board.png)
- [近景・画面全体](scenery/natural-near.png) / [盤面のみ](scenery/natural-near-board.png)

条件はpainted-river、蛇行河川40×28、主80体・少数系統、ターン0。描画用の配置変更や相の変更をしていない。遠近は同一世界・同一生態指紋。観察集中モードで設定を隠し盤面を広げる。設定へ復帰でき、生態計算へ影響しない。

## 第三相の形を確認する表示fixture

[遠景](scenery/fixture-far.png) / [近景](scenery/fixture-near.png) / [近景盤面](scenery/fixture-near-board.png)。実際の河川セル上へ第三相の4個体を明示配置した表示用fixture。自然な到達・相間の競争・収支成立を示すものではない。このfixtureではターンを進めず、同じ世界の遠近を撮影している。

## 変更

実装用の8地表材質と透過地物8区画を画像生成で制作し、セルの環境・水陸・被覆・岩地・壁へ接続した。由来とSHAは[material-provenance.json](material-provenance.json)。新しい画像を完成背景として盤面へ貼らず、実データから合成する。模様の花・苔は可食生物や通行障害を増やさない。

水際はセル中心値を保つ双線形輪郭、深浅は描画上の混合、材質境界も混合でつなぐ。反復は鏡映し、地物の形・向き・セル内位置に描画専用の差を付ける。地形・通行・生物位置は変更しない。近景の生物台座を接地影に替え、320px/セルまで拡大可能。全体ボタンは縮尺に関係なく記号モード、近景ボタンは選択地点の96px詳細モード。

## 検査と適用境界

[地表・観察12](scenery/report.json)、[遠景15](overview/report.json)、[年齢16](age-ui/report.json)、[既存画面45](browser/report.json)、[保存再生13](observation/observation.json)を通過。画像読込/透過、集中操作・復帰、遠近・拡大の生態独立、狭幅、全対象描画、自然進行の有限台帳、同一終端指紋・再記録拒否、ブラウザ例外なしを確認。各実行ログは同名の.log、構造・配布補助検査は[structure.log](structure.log)。

[biology-identity.json](biology-identity.json)で生態11ファイル＋計算指紋の12 SHAが2.5対象と一致。今回の変更は生態バランスを再調整しておらず、従前の限定証跡の範囲を超えない。

## 未達

採用全生物の専用形状・雌雄/枝/年齢素材、最終的なモックとの構図・造形・情報の読みやすさの一致は未完。既存生物アトラスを維持し、立体地形や透視カメラは追加していない。材質の反復も残る。大盤面の初回描画と利用者端末での性能は未計測。300〜500の存続率・P/Q維持・Windows実exe2.7は今回の合格範囲外。
