# 世界作成UI：優先3点の実装契約

起点 main e32bcac / app4.2.74。利用者の「進めてください」に基づき提案の優先3点を採用。FLOW-04→05→08。A1/B5/C8/D9/E6の既存責務内、新Node・分割・正式状態変更なし。61Nodeは草案。

範囲は design/specification/setup-intent-v2.md。まずA/Bへ意味を反映、C8へ実装、D9の限定画面確認を行いE6とManifestへ反映する。入力・readConfig本体・生態・生成/保存契約は維持。

D9: 3セット×自動/指定、値の由来と不使用、個別指定/解除、地形制約による傾向変更、条件まとめと変更リンク、空欄/0・無効群・供給OFF、セットの規模変更、390px/標準画面を確認する。既存setup-flowとsetup-defaultsで実生成/取消/復帰を確認する。ソース比較でreadConfigと生成本体不変を照合。全件/500T/Windows/配布は行わない。

証跡: operations/evidence/setup-intent-v2/README.md。確認で新規問題があれば利用者へ知らせ、今回UIで生じた範囲を修正する。

結果: Linux35項目＋既存27/13項目、Manifest1試験が成功。6構成の旧main設定一致と61Nodeの構造/草案、core不変を確認。実画面と限定範囲は上記証跡へ記録。
