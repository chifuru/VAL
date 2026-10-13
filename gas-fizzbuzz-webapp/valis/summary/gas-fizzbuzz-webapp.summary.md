# Project Summary Manifest — gas-fizzbuzz-webapp

project_id: gas-fizzbuzz-webapp
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
canonical_path: valis/summary/gas-fizzbuzz-webapp.summary.md
core_definition_mutation: prohibited
current_status: ピクセル描画の3段階識別性強化と再生後の最終形態肖像カードを実装しE3で30件V8モック検証（GAS実機未検証）
initial_registration_existing: A1, B1, C1, D1, E1
initial_registration_previous: A1.1〜A1.5, B1.1〜B1.5, C1.1〜C1.5, A1.6, B1.6
initial_registration_previous_split_and_evidence: B1.4.1, B1.4.2, C1.4.1, C1.4.2, C1.4.3, C1.6, D1.1, D1.2, D1.3, D1.4, E2
initial_registration_this_change: E3
manifest_reflection_this_change: A1.2, A1.5, B1.2, B1.5, C1.3, C1.5, D1.3, E3, src/Index.html, tests/creature.test.cjs, README.md
last_reflected_flow: FLOW-05 描画・終了時UIの差分反映、FLOW-08 30件V8モック限定証跡E3
unresolved_summary: 実Node npm test未実施、GAS実機・Canvas視覚品質・自動スクロール・モバイル・アクセシビリティ未検証、造形の人間評価・仮係数の調整は必要、全ノード草案

## Node構造・参照要約

親子関係: 同一層のID階層に従い、B1.4.1/2はB1.4の子、C1.4.1/2/3はC1.4の子。C1.6はC1の子。D1.1〜4はD1の子。E1/E2/E3は検証版ごとに独立した起点。
層間関係: derived_from / implements / verifies / evidence_for による意味接続のみ（層間parent_idは禁止）。
A/B/C/D/Eを機械的に同数へ揃えず、実装・検証・証跡の独立単位に応じて分割する。

## A: 仕様

A1:（外部参照 / FizzBuzz GASアプリ統合仕様）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A1.md。主所属: A層。起点ノード、parent_idなし。 。
	ロジック:
		出力不変・DNA・4種餌・3段階・成熟の仕様索引。
	実態:
		状態: 草案。処理フラグ: 実機評価/係数調整。次FLOW候補: FLOW-08。

	A1.1:（A1 / FizzBuzz入力と出力契約）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.1.md。主所属: A層。parent_id: A1。 B1.1 / C1.1/C1.2。
		ロジック:
			N=1..1000の整数、返却は1..Nの文字列配列N件・出力形式不変。
		実態:
			状態: 草案。処理フラグ: GAS実機未検証。次FLOW候補: FLOW-08。

	A1.2:（A1 / 出力同期の自動再生仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.2.md。主所属: A層。parent_id: A1。 B1.2 / C1.3。
		ロジック:
			1行1件再生、スキップ全文一致、成熟後もNまで再生。終了後に別領域へ今回の最終形態カードを表示。
		実態:
			状態: 草案。処理フラグ: 実ブラウザ未検証。次FLOW候補: FLOW-08。

	A1.3:（A1 / 4種餌の蓄積・調節・色彩と体積）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.3.md。主所属: A層。parent_id: A1。 B1.3/B1.4.1 / C1.4.1/C1.4.2。
		ロジック:
			青/黄/紫の栄養餌と数字調節餌、色=栄養比率、体積=有効P。
		実態:
			状態: 草案。処理フラグ: 倍率と調節持続は暫定。次FLOW候補: FLOW-08。

	A1.4:（A1 / DNAと餌による3段階進化・分岐・成熟）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.4.md。主所属: A層。parent_id: A1。 B1.4.2 / C1.4.3。
		ロジック:
			魚→陸生動物→宇宙生物、P=10/35/100の仮閾値、成熟後は外見固定。
		実態:
			状態: 草案。処理フラグ: 分岐/閾値は調整対象。次FLOW候補: FLOW-08。

	A1.5:（A1 / ピクセル生物の外見・演出）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.5.md。主所属: A層。parent_id: A1。 B1.5 / C1.5。
		ロジック:
			DNA特徴の継承、餌の色・体積・模様、3段階の器官を見分けられるドット描画と再生完了時の静止肖像。
		実態:
			状態: 草案。処理フラグ: 実ブラウザの視覚評価未実施。次FLOW候補: FLOW-08。

	A1.6:（A1 / 入力数値N全体によるDNA生成）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.6.md。主所属: A層。parent_id: A1。 B1.6 / C1.6。
		ロジック:
			決定的6軸DNA、同一N同一外見、初期は魚/中立色/体積1。
		実態:
			状態: 草案。処理フラグ: DNA分布の評価対象。次FLOW候補: FLOW-08。

## B: 機能

B1:（外部参照 / FizzBuzz算出・再生・育成の機能索引）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B1.md。主所属: B層。起点ノード、parent_idなし。 derived_from: A1。
	ロジック:
		入力/再生/4種餌/成長・進化/ピクセル/DNAの6機能群。
	実態:
		状態: 草案。処理フラグ: 暫定パラメータの評価。次FLOW候補: FLOW-08。

	B1.1:（B1 / 入力検証とGAS計算通信）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.1.md。主所属: B層。parent_id: B1。 derived_from: A1.1; implements側: C1.1/C1.2。
		ロジック:
			Nの検証とFizzBuzz算出要求・エラー処理。
		実態:
			状態: 草案。処理フラグ: 実機通信未検証。次FLOW候補: FLOW-08。

	B1.2:（B1 / 出力行再生と操作）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.2.md。主所属: B層。parent_id: B1。 derived_from: A1.2; implements側: C1.3。
		ロジック:
			逐次出力・停止/再開/スキップ・低モーション。終了時の結果カードを同一処理で提示。
		実態:
			状態: 草案。処理フラグ: 実ブラウザ未検証。次FLOW候補: FLOW-08。

	B1.3:（B1 / 4種餌の分類と調節履歴）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.3.md。主所属: B層。parent_id: B1。 derived_from: A1.3; implements側: C1.4.1。
		ロジック:
			3種栄養と数字餌を排他的に集計。
		実態:
			状態: 草案。処理フラグ: 数学的バランスの調整。次FLOW候補: FLOW-08。

	B1.4:（B1 / 成長・進化・成熟判定の機能索引）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.4.md。主所属: B層。parent_id: B1。 derived_from: A1.4; implements側: C1.4。
		ロジック:
			成長演算と進化・成熟判定を子機能に分割。
		実態:
			状態: 草案。処理フラグ: 閾値・重みは暫定。次FLOW候補: FLOW-08。

		B1.4.1:（B1.4 / 調節を反映した有効成長P）［草案］
			構成（要素・関係）:
				Node File: valis/nodes/B/B1.4.1.md。主所属: B層。parent_id: B1.4。 derived_from: A1.3/A1.4; implements側: C1.4.2。
			ロジック:
				数字餌の剰余・次の栄養1回・倍率0.75/1.25。
			実態:
				状態: 草案。処理フラグ: 持続・効率は暫定。次FLOW候補: FLOW-08。

		B1.4.2:（B1.4 / 段階進化・分岐・完全成熟）［草案］
			構成（要素・関係）:
				Node File: valis/nodes/B/B1.4.2.md。主所属: B層。parent_id: B1.4。 derived_from: A1.4; implements側: C1.4.3。
			ロジック:
				3段階・成熟100P・Lispエイリアン等への種族分岐。
			実態:
				状態: 草案。処理フラグ: 造形と閾値は暫定。次FLOW候補: FLOW-08。

	B1.5:（B1 / 生き物のピクセル描画）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.5.md。主所属: B層。parent_id: B1。 derived_from: A1.5; implements側: C1.5。
		ロジック:
			魚の尾・ひれ、陸生の四肢、宇宙の触角などのドット部品、4種餌、成熟後固定と最終肖像表示。
		実態:
			状態: 草案。処理フラグ: 実機視覚品質未評価。次FLOW候補: FLOW-08。

	B1.6:（B1 / 数値シードによるDNA構築）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.6.md。主所属: B層。parent_id: B1。 derived_from: A1.6; implements側: C1.6。
		ロジック:
			N全体から6軸DNAを決定的生成。
		実態:
			状態: 草案。処理フラグ: 分布を評価。次FLOW候補: FLOW-08。

## C: 実装

C1:（外部参照 / GAS HTMLサービスと生物実装統合）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C1.md。主所属: C層。起点ノード、parent_idなし。 implements: B1。
	ロジック:
		Code.gsとIndex.htmlの実装索引。Code.gsの出力契約維持。
	実態:
		状態: 草案。処理フラグ: GAS実機未検証。次FLOW候補: FLOW-08。

	C1.1:（C1 / GASサーバーFizzBuzz算出）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.1.md。主所属: C層。parent_id: C1。 implements: B1.1。
		ロジック:
			src/Code.gsは旧版から変更せず、N件の文字列配列を返す。
		実態:
			状態: 草案。処理フラグ: GAS実機未検証。次FLOW候補: FLOW-08。

	C1.2:（C1 / 入力・GAS通信・エラー処理）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.2.md。主所属: C層。parent_id: C1。 implements: B1.1。
		ロジック:
			src/Index.htmlの入力検証・google.script.run。
		実態:
			状態: 草案。処理フラグ: 実機未検証。次FLOW候補: FLOW-08。

	C1.3:（C1 / 自動再生状態機械）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.3.md。主所属: C層。parent_id: C1。 implements: B1.2。
		ロジック:
			逐次処理・速度/停止/再開/スキップ・低モーション、finish→presentFinalの終了時UI表示。
		実態:
			状態: 草案。処理フラグ: 実ブラウザ未検証。次FLOW候補: FLOW-08。

	C1.4:（C1 / 餌・調節・成長・進化の実装群）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.4.md。主所属: C層。parent_id: C1。 implements: B1.3/B1.4。
		ロジック:
			C1.4.1～C1.4.3の統合索引、src/Index.html。
		実態:
			状態: 草案。処理フラグ: 係数・種族造形は暫定。次FLOW候補: FLOW-08。

		C1.4.1:（C1.4 / 4種餌排他的分類・集計）［草案］
			構成（要素・関係）:
				Node File: valis/nodes/C/C1.4.1.md。主所属: C層。parent_id: C1.4。 implements: B1.3。
			ロジック:
				classify/stepGrowthで3栄養＋数字調節を分類。
			実態:
				状態: 草案。処理フラグ: モックテスト対象。次FLOW候補: FLOW-08。

		C1.4.2:（C1.4 / 数論的調節・成長ポイント演算）［草案］
			構成（要素・関係）:
				Node File: valis/nodes/C/C1.4.2.md。主所属: C層。parent_id: C1.4。 implements: B1.4.1。
			ロジック:
				modifierFor/stepGrowthで最新数字の効果を次の栄養1回に適用。
			実態:
				状態: 草案。処理フラグ: モックテスト対象。次FLOW候補: FLOW-08。

		C1.4.3:（C1.4 / 3段階・形態選択・成熟時外見固定）［草案］
			構成（要素・関係）:
				Node File: valis/nodes/C/C1.4.3.md。主所属: C層。parent_id: C1.4。 implements: B1.4.2。
			ロジック:
				stageFor/appearanceFor/stepGrowthの決定的形態処理。
			実態:
				状態: 草案。処理フラグ: モックテスト対象。次FLOW候補: FLOW-08。

	C1.5:（C1 / Canvasピクセル生物・餌演出）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.5.md。主所属: C層。parent_id: C1。 implements: B1.5。
		ロジック:
			32格子ピクセル・ellipse/polygonによる魚/陸生/宇宙の特徴的な器官・系統差・終了時静止肖像。
		実態:
			状態: 草案。処理フラグ: 本物の見た目は未検証。次FLOW候補: FLOW-08。

	C1.6:（C1 / 入力Nから決定的6軸DNA）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.6.md。主所属: C層。parent_id: C1。 implements: B1.6。
		ロジック:
			dnaForのxorshift32・6軸DNA。
		実態:
			状態: 草案。処理フラグ: モックテスト対象。次FLOW候補: FLOW-08。

## D: 検証計画

D1:（外部参照 / 生物育成と出力不変の検証計画）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D1.md。主所属: D層。起点ノード、parent_idなし。 verifies: A/B/C。
	ロジック:
		D1.1～D1.4へ独立した検証観点を委譲。
	実態:
		状態: 草案。処理フラグ: GAS実機未検証。次FLOW候補: FLOW-08。

	D1.1:（D1 / FizzBuzz出力契約回帰）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/D/D1.1.md。主所属: D層。parent_id: D1。 verifies: A1.1/A1.2/B1.1/B1.2/C1.1/C1.3。
		ロジック:
			出力不変・成熟してもN行完走・エラー系。
		実態:
			状態: 草案。処理フラグ: モックテスト対象。次FLOW候補: FLOW-08。

	D1.2:（D1 / DNA・餌・進化・成熟ロジック）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/D/D1.2.md。主所属: D層。parent_id: D1。 verifies: A1.3/A1.4/A1.6/B1.3/B1.4/C1.4/C1.6。
		ロジック:
			決定的DNA・4種餌・数論・成長P・完全成熟の境界。
		実態:
			状態: 草案。処理フラグ: モックテスト対象。次FLOW候補: FLOW-08。

	D1.3:（D1 / 再生・Canvasモック・操作）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/D/D1.3.md。主所属: D層。parent_id: D1。 verifies: A1.2/A1.5/B1.2/B1.5/C1.3/C1.5。
		ロジック:
			一時停止/再開/スキップ/低モーション、段階別のドット描画差分、終了時の最終形態カード表示とリセット。
		実態:
			状態: 草案。処理フラグ: 実ブラウザ未検証。次FLOW候補: FLOW-08。

	D1.4:（D1 / GAS実環境・画面品質）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/D/D1.4.md。主所属: D層。parent_id: D1。 verifies: C1.1/C1.2/C1.3/C1.5/C1.6。
		ロジック:
			GAS HtmlServiceと実通信・Canvas画面の確認計画。
		実態:
			状態: 草案。処理フラグ: 未実施。次FLOW候補: FLOW-08。

## E: 検証証跡

E1:（外部参照 / 旧実装に対するV8モック証跡）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E1.md。主所属: E層。起点ノード、parent_idなし。 evidence_for: D1/C1（旧版）。
	ロジック:
		旧ソースの15テスト成功記録、新実装版の証明には使用しない。
	実態:
		状態: 草案。処理フラグ: 対象旧版に限定。次FLOW候補: FLOW-08。

E2:（外部参照 / 前版DNA・4種餌・成熟のV8モック証跡）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E2.md。主所属: E層。起点ノード、parent_idなし。 evidence_for: D1.1/D1.2/D1.3（新版）。
	ロジック:
		指定GitHub blobのテスト25件がV8互換モックで成功、失敗0。
	実態:
		状態: 草案。処理フラグ: 実npm test/GAS実機未実施。次FLOW候補: FLOW-08。

E3:（外部参照 / 改良ピクセル描画・最終形態カードのV8モック証跡）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E3.md。主所属: E層。起点ノード、parent_idなし。evidence_for: D1.1/D1.2/D1.3, C1.3/C1.5。
	ロジック:
		最終描画版のGitHub src/test blobを対象に30件のモックV8テストを実行し、成功30・失敗0。終了時のカード表示・未成熟/成熟の区別、スキップ/低モーション一致、3形態の描画差を検証。
	実態:
		状態: 草案。Node.js実ランナー・GAS/実ブラウザ表示・目視品質は未検証。次FLOW候補: FLOW-08。

## 今回の差分と処理区別

- **Manifest初期登録（今回）**: E3をE1/E2と独立した新しい証跡Node Fileとして登録。今回のA/B/C/D対象ノードは既存ファイルへの差分反映であり、新規分割は不要。
- **Manifest反映（今回）**: A1.2/A1.5（結果提示と造形要件）、B1.2/B1.5（完了イベントと静止肖像）、C1.3/C1.5（実装）、D1.3（追加テスト計画）、E3（V8検証証跡）を要約。
- **src/tests/README変更**: src/Index.html（魚の尾/えら・陸生の四肢・宇宙の触角などのドットパーツ描画と結果カード）、tests/creature.test.cjs（追加5件を含む21件）、README.md（仕様記録）を更新。src/Code.gs・tests/fizzbuzz.test.cjs・Core Definitionは不変。
- **出力形式維持**: 出力は常に従来のN件の文字列配列の改行結合。最終形態カードには種族/段階/P/成熟状態/餌数/色/個体番号を表示し、FizzBuzz結果欄には混入しない。成熟未達もその段階で「今回の最終形態」として提示。
- **証跡区別**: E1・E2は以前のソース版の検証、E3は今回の描画と終了カードを含むsrc/test blobを対象としたV8互換モック30件成功・失敗0。実Node npm test/GAS/ブラウザ視覚品質は未実施。
- **設計変数**: 初期DNA/4種餌/進化閾値10/35/100/完全成熟の論理は変更なし。ピクセル造形・スクロール挙動・スマートフォン表示は実機評価後に調整可能。
- **状態・次FLOW**: 全ノード草案。承認済み化/デプロイ/公開は未実施。次はFLOW-08の実Node・GAS・ブラウザ検証。
