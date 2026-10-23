# 改善項目の現在の対応状況

現在app4.2.74。今回再提示された13項目を、実装・仕様・既存証跡と照合した。`ok`は記載範囲の利用者要求に対する対応状況であり、正式Nodeの承認/検証済み状態ではない。61Nodeはすべて草案を保持する。過去の証跡を今回再実行したとはしない。

## 今回の実施範囲と順番

利用者が指定したバグ修正・操作改善・処理軽減に限定する。下の13項目表は全体の対応状況であり、そこに残る機能拡張を今回の作業へ自動追加しない。

1. ドーナツ切替の仕上げ・main統合：今回の対象。既存23項目の確認済みソースと同一であることを照合。
2. 画像の切り抜き漏れ：次の対象。既存68状態の修正を維持し、残る実際の漏れを確認して直す。
3. 設定画面の上位→下位整理・選択制約・案内：段階整理は未完。既知の制約は保持する。
4. 長期グラフの描画負荷：追加軽減候補。原値/全期間記録を維持する。
5. 詳細・追跡表示の重複計算：追加軽減候補。凍結詳細/本人状態と現在値を混同しない。
6. 非表示部分の不要処理：追加軽減候補。生態更新/記録と表示用の処理を区別する。
7. 長期高速観測の仕上げ：既存の3速度/10T表示を土台に、長期利用時の負荷と操作を確認する。生態計算の近似は未採用で、必要になれば採用前に確認する。

各単位を仕上げてmainへ統合する。新しい問題を発見した場合は内容を伝えてから扱う。配布は別指示があるまで作成しない。生物量ピラミッドの切替、関係グラフの意味の再設計、資源地形強調、要因色分けは今回の対象外。

## 全体の対応状況

| ID | 項目 | 状態 | 対応範囲・残り | 根拠 |
| --- | --- | --- | --- | --- |
| R01 | ドーナツグラフの切替 | ok | 今回接続。全生物の系統別/分類別と6分類。対象内分母・対象0・凡例色・図鑑復帰を23項目で限定確認。 | operations/evidence/current-donut-switch-v1/README.md |
| R02 | 生物量ピラミッドの切替・寄生虫/腐肉食など | 未対応 | 現行は5つの食性層。分解者/P/Qは別枠注記であり、切替機能や特別な食性の表示は未接続。極少量の最小幅表示の修正とは区別する。 | src/app.js / renderCurrentStructure; operations/evidence/graph-readability-v1/README.md |
| R03 | 作成条件をデフォルトへ戻す | ok | 設定画面上部の全体復帰ボタンを接続済み。下層のみ復帰も保持。13項目の既存証跡あり。 | operations/evidence/setup-defaults-v1/README.md |
| R04 | 生態観測の対象を分類から選ぶ | ok | 分類→分類全体/所属系統の2段階。15項目の既存証跡あり。 | operations/evidence/graph-targets-v1/README.md |
| R05 | 生態関係グラフを意味のある内容へ | 未対応 | 系統の存在数や接触の説明を足すだけでは解消しない。現在の広がり/作用種類/継続系列から、実際の栄養・寄生・競争の関係や依存/偏りを読み取れる表現へ詰める必要がある。配置/文字/矢印の修正だけを完了扱いしない。 | src/app.js / renderGraphs; design/specification/relationship-network-v1.md |
| R06 | 画像の切り抜き | 一部ok | 指摘のあったP/Q・独立植物・量機の詳細/系統樹は68状態を修正・確認済み。全主生物/全下層/全地形素材を一括確認した証跡ではない。 | operations/evidence/inspector-cutouts-v1/README.md |
| R07 | 相・進化条件の記載 | ok | 現在相と系統樹の進化条件は既存実装あり。P本人相と宿主段階も分離。不要として削除した一般的な型名とは区別する。全系統で自然な相進化を再実測したという意味ではない。 | src/app.js / drawTree, drawPrimaryTree, drawHyperTree; operations/evidence/inspector-cutouts-v1/README.md |
| R08 | 条件不整合を選べない上位→下位設定 | 一部ok | 既知の人数/系統数、無効群、固定モード、寄生宿主数などの事前制約と近傍案内は対応済み。全条件/全地形の事前保証と設定画面全体の段階整理は未完。 | operations/evidence/generation-preflight-v1/README.md; operations/evidence/parasite-founder-preflight-v1/README.md |
| R09 | 長期高速観測・処理軽減 | 採用範囲はok | 結果を変えない軽減、基準/2倍/最速、10Tまとめ表示、強制軽減/復元を接続済み。生態規則を近似する計算簡素化は未実施で、従来選択した範囲の対象外。長期性能倍率の認定ではない。 | operations/evidence/observation-speed-v1/README.md; operations/evidence/selection-index-v1/README.md; operations/evidence/long-record-restore-v1/README.md |
| R10 | 選択中パラメータ固定・手動更新 | ok | 選択/手動更新した時点の詳細を固定。17項目の既存証跡あり。追跡と独立する。 | operations/evidence/selection-snapshot-v1/README.md |
| R11 | 鉱物・情報・地形の色付き所在強調 | 未対応 | 生物・分類の強調はあるが、資源/情報/地形の凡例を同じ選択式の所在強調へつなぐ機能はない。 | src/app.js / renderMapKey; src/ecology/renderer.js / mark |
| R12 | 経験・情報・遺伝による変化の色分け | 未対応 | 本人経験/受取学習/遺伝適応は説明・詳細に存在するが、要求された要因別の色分けは未接続。現在の総能力差をすべて要因へ逆算して補完しない。 | src/app.js / persistentSubjectHTML, primaryParasiteHTML |
| R13 | 作成画面全体を分かりやすく再構成 | 未対応 | R08の事前制約/説明は既存。シミュレーションゲームの設定導線を参考に、上位決定→下位設定の順に画面全体を整理する作業は別途必要。 | src/Index.html / setup; design/specification/generation-preflight-v1.md |

次の作業単位は上記2「画像の切り抜き漏れ」。未完の拡張項目は上の全体表に残し、今回の着手順には含めない。
