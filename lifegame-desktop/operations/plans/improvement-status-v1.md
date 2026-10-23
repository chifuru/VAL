# 改善項目の現在の対応状況

現在app4.2.74。今回再提示された13項目を、実装・仕様・既存証跡と照合した。`ok`は記載範囲の利用者要求に対する対応状況であり、正式Nodeの承認/検証済み状態ではない。61Nodeはすべて草案を保持する。過去の証跡を今回再実行したとはしない。

## 今回の実施範囲と順番

利用者が指定したバグ修正・操作改善・処理軽減に限定する。下の13項目表は全体の対応状況であり、そこに残る機能拡張を今回の作業へ自動追加しない。

1. ドーナツ切替の仕上げ・main統合：ok。既存23項目の確認済みソースを照合して反映済み。
2. 画像の切り抜き漏れ：ok。既存68状態の修正を維持し、303素材領域/96描画と実UIを確認。主生物の詳細6状態の端欠けを修正。
3. 設定画面の上位→下位整理・選択制約・案内：ok。5区画と末尾作成、非活性理由・欄エラー/修正先を接続。既存の制約/生成契約を維持。
4. 長期グラフの描画負荷：今回の重複走査軽減はok。横座標共有/更新走査統合、全点/原値/画素一致。単独合成Canvasは約2%差で、大幅高速化ではない。証跡: operations/evidence/graph-stack-work-v1/README.md。
5. 詳細・追跡表示の重複計算：今回の配置共有はok。能力表示/量機同居の全Map再作成を省略し、HTML/画素/原値と固定詳細/追跡の独立を17項目で限定確認。証跡: operations/evidence/selection-combat-index-v1/README.md。
6. 非表示部分の不要処理：今回のタブ内更新省略はok。非表示一覧/生存系統を省略し、復帰時に最新化。最終18項目、原値/固定詳細/所在色/最速時点を保持。証跡: operations/evidence/hidden-inspector-updates-v1/README.md。
7. 長期高速観測の仕上げ：次の対象。既存の3速度/10T表示を土台に、長期利用時の負荷と操作を確認する。生態計算の近似は未採用で、必要になれば採用前に確認する。

各単位を仕上げてmainへ統合する。新しい問題を発見した場合は内容を伝えてから扱う。配布は別指示があるまで作成しない。生物量ピラミッドの切替、関係グラフの意味の再設計、資源地形強調、要因色分けは今回の対象外。

## 全体の対応状況

| ID | 項目 | 状態 | 対応範囲・残り | 根拠 |
| --- | --- | --- | --- | --- |
| R01 | ドーナツグラフの切替 | ok | 今回接続。全生物の系統別/分類別と6分類。対象内分母・対象0・凡例色・図鑑復帰を23項目で限定確認。 | operations/evidence/current-donut-switch-v1/README.md |
| R02 | 生物量ピラミッドの切替・寄生虫/腐肉食など | 未対応 | 現行は5つの食性層。分解者/P/Qは別枠注記であり、切替機能や特別な食性の表示は未接続。極少量の最小幅表示の修正とは区別する。 | src/app.js / renderCurrentStructure; operations/evidence/graph-readability-v1/README.md |
| R03 | 作成条件をデフォルトへ戻す | ok | 設定画面上部の全体復帰ボタンを接続済み。下層のみ復帰も保持。13項目の既存証跡あり。 | operations/evidence/setup-defaults-v1/README.md |
| R04 | 生態観測の対象を分類から選ぶ | ok | 分類→分類全体/所属系統の2段階。15項目の既存証跡あり。 | operations/evidence/graph-targets-v1/README.md |
| R05 | 生態関係グラフを意味のある内容へ | 未対応 | 系統の存在数や接触の説明を足すだけでは解消しない。現在の広がり/作用種類/継続系列から、実際の栄養・寄生・競争の関係や依存/偏りを読み取れる表現へ詰める必要がある。配置/文字/矢印の修正だけを完了扱いしない。 | src/app.js / renderGraphs; design/specification/relationship-network-v1.md |
| R06 | 画像の切り抜き | ok | 既存68状態に加え、残る303素材領域/96描画と実詳細/系統樹を確認。主生物6状態の端欠けを修正。全状態直積/全アニメーションの網羅ではない。 | operations/evidence/remaining-cutouts-v1/README.md; operations/evidence/inspector-cutouts-v1/README.md |
| R07 | 相・進化条件の記載 | ok | 現在相と系統樹の進化条件は既存実装あり。P本人相と宿主段階も分離。不要として削除した一般的な型名とは区別する。全系統で自然な相進化を再実測したという意味ではない。 | src/app.js / drawTree, drawPrimaryTree, drawHyperTree; operations/evidence/inspector-cutouts-v1/README.md |
| R08 | 条件不整合を選べない上位→下位設定 | ok | 既知の制約を保持して5区画・非活性理由・欄エラー/修正先を接続。地形容量の全組合せを事前保証するものではない。 | operations/evidence/setup-flow-v1/README.md; operations/evidence/parasite-founder-preflight-v1/README.md |
| R09 | 長期高速観測・処理軽減 | 採用範囲はok | 結果を変えない軽減、基準/2倍/最速、10Tまとめ表示、強制軽減/復元を接続済み。生態規則を近似する計算簡素化は未実施で、従来選択した範囲の対象外。長期性能倍率の認定ではない。 | operations/evidence/observation-speed-v1/README.md; operations/evidence/selection-index-v1/README.md; operations/evidence/long-record-restore-v1/README.md |
| R10 | 選択中パラメータ固定・手動更新 | ok | 選択/手動更新した時点の詳細を固定。17項目の既存証跡あり。追跡と独立する。 | operations/evidence/selection-snapshot-v1/README.md |
| R11 | 鉱物・情報・地形の色付き所在強調 | 未対応 | 生物・分類の強調はあるが、資源/情報/地形の凡例を同じ選択式の所在強調へつなぐ機能はない。 | src/app.js / renderMapKey; src/ecology/renderer.js / mark |
| R12 | 経験・情報・遺伝による変化の色分け | 未対応 | 本人経験/受取学習/遺伝適応は説明・詳細に存在するが、要求された要因別の色分けは未接続。現在の総能力差をすべて要因へ逆算して補完しない。 | src/app.js / persistentSubjectHTML, primaryParasiteHTML |
| R13 | 作成画面全体を分かりやすく再構成 | ok | 観察条件→地形→参加生物→栄養/詳細→作成の順。元の入力/初期値を維持し、390pxと標準幅の代表を確認。 | operations/evidence/setup-flow-v1/README.md |

次の作業単位は上記7「長期高速観測の仕上げ」。未完の拡張項目は上の全体表に残し、今回の着手順には含めない。
