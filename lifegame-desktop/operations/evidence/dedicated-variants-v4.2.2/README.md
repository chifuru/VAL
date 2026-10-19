# 全主系統の専用分岐 / app4.2.2

## 実装
既存の日輪/浮遊傘を維持し、不足19系統165枝を10枚の透明原画として追加。主21系統183枝を専用原画で選択。早成甲殻は第三相3枝。新原画の参照範囲は身体の連結成分に沿って指定し、矩形の機械的な等分で身体を切らない。縦横比を保持し、近隣の大きな断片を除外する清掃を新分岐素材だけへ適用。表示入力が早成の上限を超えた場合はIII相へ収め、世界の相を変更しない。

## 検査
- browser.log / report.json: 全画像読込、全21系統の枝セレクタ、183枝の非空/系統内画像差、入力不変、早成の上限、遠近/相分離の生態指紋不変、ブラウザ例外0。変更前25690e3のart.jsと全21系統I/II相42条件をピクセル一致で照合（9確認）。
- smoke.log: 既存画面操作47項目通過。早成に架空のIVを渡す旧テストは実際の最終相を渡す形へ変更。
- primary-plane.log / primary-plane/report.json: 相分離22確認。直接選択/追跡/P-Q/動作座標/Worker一致。
- unit.log: 表示座標/投影/保存10テスト。assets.log: SHA/寸法/領域/両manifest一致。model.log: 生成生態モデル一致。
- source-regions.json: 新原画の身体参照範囲。source-hashes.json: 対象ソース/原画SHA。
- structure.log: Node/参照/実ファイル/core不変の照合。

## 画像と限界
branches-1〜3.pngは製品EcoArtで描いた全枝比較。far.png / near-separated.pngは明示的な表示試行の実画面。生存率を評価する新しい試行や500Tの検証ではない。既存遠景記号、renderer、生態コード/係数/計算署名と既存21原画は変更なし。全枝の専用原画接続と、全系統の雌雄/年齢/階級/寄生/下層の専用差完成を区別する。後者はdesign/dedicated-variants-v4.2.2/coverage.mdで未完管理。画像差を1マス/最大密度での最終外観承認とはしない。正式Nodeは草案を維持。

Windowsの配布生成・同梱一致はpackage.log/package-report.json/package-contents.log。実Windows起動・性能確認は未実施。

既存造形検査graphics.logの18項目も通過。83相比較、自然進行100Tの不変条件、寄生付着/主・餌選択を確認。全シート数はmanifestの宣言数、個体選択は対象IDで検査し、P/Q選択ボタンが増えても主/餌の存在確認を維持する。
