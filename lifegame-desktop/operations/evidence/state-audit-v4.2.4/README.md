# 4.2.4 書き分け接続監査の実測

Linux Chromiumで製品EcoArtを呼び、全31系統を索引化。主21系統の各相×雌雄×全年齢498、群体階級9、下層/寄生23、量/環境28、資源16、計574条件を描画。11枚の比較画像を保存しました。入力不変、年齢の一致、非空描画、例外0、全srcのSHA不変を確認。全21主系統の専用枝数は20系統×9+早成甲殻3=183。

- 契約: ../../plans/state-audit-v4.2.4.md。
- [実測JSON](report.json)、[ログ](capture.log)、[製品SHA](source-hashes.json)、[監査手順SHA](audit-hashes.json)。
- [比較画像と不足一覧](../../../design/state-audit-v4.2.4/README.md)。再実行用capture.cjsも同ディレクトリ。
- 主生物の雌雄/年齢は共通変形、群体階級は小印中心。下層7対象は量/環境補正のみで、年齢変形は適用されない。寄生専用原画は宿主/探索表示に未接続。死骸は固定×印。静的経路確認はsrc/ecology/art.jsのvariant/food、renderer.jsのcarcasses/infection/searchQを対象としました。

これは読込・描画・接続監査です。574条件の見やすさ合格、全枝×全年齢、密集、実マップ全画面、モーション、Windows実機、長期バランスの確認ではありません。製品コード/素材/係数/版/配布は変更なし。次は既存原画のある寄生P/Qと死骸の描画接続、下層の状態差、主生物の系統固有差の順です。

有効条件はsource-hashes.jsonの製品とcaptureの固定入力。原画、参照、年齢境界、描画処理が変わった対象は再確認します。正式Node状態は草案を維持。

Node/Manifestの階層・参照・実ファイル・core不変の既存構造検査1件通過（structure.log）。Manifest反映はC8.1/D9/E6、新規Node初期登録なし。
