# 採用モックを基準にした描画修正 v2.8

基準は[採用遠景](../../../design/visual-alignment-v4/far.png)と[採用近景](../../../design/visual-alignment-v4/near.png)。今回は素材追加をもって一致とはせず、構成・描画の差を次のように扱う。**全体のモック再現は未完**。機能検査の成功は視覚的一致・利用者承認を意味しない。

|項目|今回の修正|残る差|
|---|---|---|
|遠景|近景の反復地表を縮小する方式から、実セル/水際に対応する専用地形図へ分離。岩・茂み・倒木を専用の陰影形で表示|背景の絵としての密度と自然さ、モックの豊かな起伏|
|近景の主生物|日輪/浮遊傘/多節蛇/深淵頭足のIII/IV相を、採用近景から代表8基本画として新規制作。既存IDのまま接続|他系統・I/II・全枝/雌雄/階級の専用作画、全方向の姿勢|
|近景の縮尺|初期96→160px/セル、最大320px。小盤面の地表キャッシュも96px/セルへ上げる|大盤面の拡大品質とメモリ/初回描画の端末別計測|
|地表の模様|鏡映で生じた対称模様を、実行時の周期的な交差混合へ変更|完全な一枚描きの背景、近景の奥行き・立体的な構図|
|選択欄|直前の確定イベントを先に示し、数値パラメータは折畳み。初期状態は未実行。集中時は重複した集計/環境資料を隠す|モックの最終的な構図・情報配置との一致|

## 同一世界の実装画面

通常の初期配置: [遠景](alignment/natural-far.png) / [近景](alignment/natural-near.png)。painted-river、蛇行河川40×28、主80体、少数系統、ターン0。描画用に相や配置を変更していない。両者は同じ生態指紋。

代表画の表示確認: [遠景](alignment/fixture-far.png) / [近景](alignment/fixture-near.png) / [近景盤面](alignment/fixture-near-board.png)。実際の水際に4系統の第三相を明示配置したfixture。同じ世界を遠近で描き、自然な進化や収支成立を示すものではない。生物の姿を確認するための配置として、通常配置の画像と区別する。

## 実装と証跡

契約は[mock-alignment-v2.8](../../plans/mock-alignment-v2.8.md)、対象実体は[source-hashes.json](source-hashes.json)。[修正画面17](alignment/report.json)、[既存画面45](browser/report.json)、[年齢16](age-ui/report.json)、[遠景15](overview/report.json)、[保存再生13](observation/observation.json)をLinux/Chromium154で確認。通常配置と表示fixture、初期状態と確定結果、遠近の生態独立、復帰・狭幅、8代表画の区別を含む。実行ログは同名.log、ノード/配布補助検査は[structure.log](structure.log)。

原画の由来とSHAは[art-provenance.json](art-provenance.json)。4系統の8基本画のみを置換し、全枝・雌雄の完成とはしない。原画を保存し、描画用の参照矩形をmanifestで定義する。年齢差は既存の描画変換、向きは立ち姿を保つ左右反転で補う。

[biology-identity.json](biology-identity.json)で生態11ファイル＋計算指紋が2.5と同一。視覚を修正したことから長期バランスやWindows実exeの成功を推定しない。[validation.json](validation.json)の未達を維持し、全59ノードの正式状態は草案のまま。
