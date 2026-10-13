# Project Summary Manifest — gas-fizzbuzz-webapp

project_id: gas-fizzbuzz-webapp
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
canonical_path: valis/summary/gas-fizzbuzz-webapp.summary.md
core_definition_mutation: prohibited
current_status: A/B層にDNA・4種餌・3段階進化・完全成熟上限の設計反映済み（草案）、C/D/Eは旧実装版
initial_registration_existing: A1, B1, C1, D1, E1
initial_registration_previous_split: A1.1, A1.2, A1.3, A1.4, A1.5, B1.1, B1.2, B1.3, B1.4, B1.5, C1.1, C1.2, C1.3, C1.4, C1.5
initial_registration_previous_DNA: A1.6, B1.6
initial_registration_this_change: なし（今回は既存A/B Node Fileのみ差分更新）
manifest_reflection_previous_split: A1, B1, C1, D1
manifest_reflection_previous_DNA: A1, A1.1, A1.3, A1.4, A1.5, B1, B1.1, B1.3, B1.4, B1.5
manifest_reflection_this_change: A1, A1.2, A1.3, A1.4, A1.5, A1.6, B1, B1.2, B1.3, B1.4, B1.5, B1.6
last_reflected_flow: FLOW-05 草案仕様・機能差分更新（既存A/B層、今回新規ノードなし）
unresolved_summary: 4種餌の促進/抑制強度・持続・DNA生成式・成長P算式・形態分岐・色/体積式・ピクセル造形未確定 / 10・35・100は調整用仮値 / C/D/E新仕様未対応 / GAS実機未検証 / npm test未実行 / 承認済み化なし

## Node構造・参照要約

親子関係: 同一層のID階層による。A1.x→A1、B1.x→B1、C1.x→C1。
層間関係: 括弧内参照元 / derived_from / implements / verifies / evidence_for。層間parent_idは禁止。
従来の15子ノードとA1.6/B1.6の2子ノードは初期登録済み。今回は新規ノードを作成せず、既存A/B層の設計差分を反映した。全ノード草案。意味参照による層間接続は親子関係としない。

## A: 仕様

A1:（/ FizzBuzz GAS Webアプリ仕様）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A1.md。主所属: A層。参照元なし。
	ロジック:
		6つの仕様条件の親ノード。DNA生成、出力不変、再生、4種餌、3段階進化+完全成熟、ピクセル表現を分離。
	実態:
		状態: 草案。子ノード6件の親索引。処理フラグ: 数字餌調節算式/仮閾値調整/造形詳細、C/D未反映、GAS実機未検証。

	A1.1:（A1 / FizzBuzz入力と出力契約）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.1.md。主所属: A層。parent_id: A1。related_to: B1.1 / C1.1 / C1.2。
		ロジック:
			1～1000整数、1..N、従来どおりのFizzBuzz文字列。N全体は初期DNAのシードも兼ねる。
		実態:
			状態: 草案。処理フラグ: GAS実機確認。次FLOW候補: FLOW-04 / FLOW-08。

	A1.2:（A1 / 出力同期の自動再生仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.2.md。主所属: A層。parent_id: A1。related_to: B1.2 / C1.3。
		ロジック:
			1行ずつ再生、テキスト不変、一時停止とスキップ。成熟してもNまで再生し、低Nは途中形態で完了可。
		実態:
			状態: 草案。処理フラグ: 実機再生確認。次FLOW候補: FLOW-04 / FLOW-08。

	A1.3:（A1 / 4種餌の蓄積・調節・色彩と体積への影響仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.3.md。主所属: A層。parent_id: A1。related_to: B1.3 / C1.4。
		ロジック:
			Fizz青/Buzz黄/FizzBuzz紫の栄養餌＋通常数字の調節餌。3種栄養比率→体色、有効成長→体積、数字の数論判定→促進/抑制。
		実態:
			状態: 草案。処理フラグ: 3/5剰余の方向案、強度・持続・混色・体積式未確定、C層未反映。次FLOW候補: FLOW-04 / FLOW-07。

	A1.4:（A1 / DNAと餌蓄積による3段階・形態分岐進化仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.4.md。主所属: A層。parent_id: A1。related_to: B1.4 / C1.4。
		ロジック:
			3段階（魚→陸生動物→宇宙生物）、進化閾値の仮値P=10/35、完全成熟の仮上限P=100。成熟は第4段階ではなく外見固定。N終了時に進化を強制せず、成熟後も出力を続ける。
		実態:
			状態: 草案。Lispエイリアンは宇宙段階の分岐候補。処理フラグ: 仮閾値調整、P/分岐式未確定、旧C/Dは4段階。次FLOW候補: FLOW-04 / FLOW-07。

	A1.5:（A1 / 生き物の視覚表現と操作性仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.5.md。主所属: A層。parent_id: A1。related_to: B1.5 / C1.5。
		ロジック:
			ピクセル表現を基本とする。DNAを継承し、3栄養餌による色・有効成長で体積、段階で輪郭が変化。完全成熟後は外見固定。
		実態:
			状態: 草案。処理フラグ: ピクセル造形・数字餌演出・成熟時固定処理=未確定、C層未反映。次FLOW候補: FLOW-04 / FLOW-07。

	A1.6:（A1 / 入力数値からの初期個体DNA生成仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.6.md。主所属: A層。parent_id: A1。related_to: A1.1 / A1.4 / A1.5。具体化: B1.6。
		ロジック:
			入力N全体から再現可能なDNAを生成。6軸候補（体形/器官/感覚器/表皮/進化適性/調節感受性）、初期は魚・中立色・体積比1.0・調節中立。
		実態:
			状態: 草案。処理フラグ: DNA生成式・6軸の厳密な定義=未確定、C/D未対応。次FLOW候補: FLOW-04 / FLOW-07。

## B: 機能

B1:（A1 / FizzBuzz算出・再生・生き物機能群）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B1.md。主所属: B層。意味参照元: A1。
	ロジック:
		入力と通信、再生、4種餌の集計・調節、3段階・完全成熟の判定、ピクセル描画、初期DNA生成の機能索引。
	実態:
		状態: 草案。子ノード6件の親索引。処理フラグ: DNA式・P計算式・仮閾値・形態分岐・描画詳細を具体化、C/D未対応。

	B1.1:（A1.1 / 入力検証とGAS計算呼出機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.1.md。主所属: B層。parent_id: B1。derived_from: A1.1; implements側: C1.1 / C1.2。
		ロジック:
			入力・通信・失敗処理。妥当なN全体をB1.6のDNA生成にも引き渡す。
		実態:
			状態: 草案。処理フラグ: GAS実機通信確認。次FLOW候補: FLOW-04 / FLOW-08。

	B1.2:（A1.2 / 出力行自動再生と操作機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.2.md。主所属: B層。parent_id: B1。derived_from: A1.2; implements側: C1.3。
		ロジック:
			自動再生、行出力、一時停止・再開・スキップ。成熟後もNまで再生、低Nでは未進化のまま終了可。
		実態:
			状態: 草案。処理フラグ: ブラウザ再生確認。次FLOW候補: FLOW-04 / FLOW-08。

	B1.3:（A1.3 / FizzBuzz分類と4種餌・調節因子集計機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.3.md。主所属: B層。parent_id: B1。derived_from: A1.3; implements側: C1.4。
		ロジック:
			3種栄養餌と数字調節餌を排他的に分類。通常数字に3/5剰余の促進/抑制を割当て、栄養餌の有効成長を調節。
		実態:
			状態: 草案。処理フラグ: 調節の強度・持続式未確定、旧C層は数字餌未対応。次FLOW候補: FLOW-04 / FLOW-07。

	B1.4:（A1.4 / DNAと餌蓄積による3段階・形態分岐判定機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.4.md。主所属: B層。parent_id: B1。derived_from: A1.4; implements側: C1.4。
		ロジック:
			DNA+4種餌の時系列から有効成長P・3段階・具体形態・成熟固定状態を算出。P=10/35/100は仮値、出力はNまで継続。
		実態:
			状態: 草案。処理フラグ: 成長P/調節/形態分岐の計算式未確定、C/D未対応。次FLOW候補: FLOW-04 / FLOW-07。

	B1.5:（A1.5 / 生き物と餌の視覚フィードバック機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.5.md。主所属: B層。parent_id: B1。derived_from: A1.5; implements側: C1.5。
		ロジック:
			DNAの特徴を継承するピクセル姿。4種餌の演出、栄養比率で色・有効成長で体積、3段階の変化と完全成熟後の外見固定。
		実態:
			状態: 草案。処理フラグ: パーツ設計・第4餌表示・成熟時の外見固定が未実装、GAS実機未検証。次FLOW候補: FLOW-04 / FLOW-07。

	B1.6:（A1.6 / 数値シードからのDNA生成・初期個体構築機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.6.md。主所属: B層。parent_id: B1。derived_from: A1.6。related_to: B1.1 / B1.4 / B1.5。
		ロジック:
			同じNから同じDNAを生成。初期は魚・中立色・体積比1.0・調節中立。6軸DNAの正規化パラメータ候補を成長/形態分岐へ渡す。
		実態:
			状態: 草案。処理フラグ: DNA6軸パラメータ・生成式未確定、C層未実装。次FLOW候補: FLOW-04 / FLOW-07。

## C: 実装

C1:（B1 / GAS HTMLサービスとピクセル生き物の実装群）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C1.md。主所属: C層。意味参照元: B1。
	ロジック:
		サーバー・通信・再生・餌進化・Canvas実装を参照する旧版実装の起点。DNA、4種餌、3段階進化、完全成熟固定は未反映。
	実態:
		状態: 草案。子ノード5件（既存）の親索引。処理フラグ: C1.4/C1.5に4種餌・新成長・成熟固定を再設計、DNA機能の新規実装、GAS実機確認。

	C1.1:（B1.1 / GASサーバー入口とFizzBuzz算出実装）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.1.md。主所属: C層。parent_id: C1。implements: B1.1; src/Code.gs。
		ロジック:
			Code.gs / appsscript.json、サーバー計算と出力契約。
		実態:
			状態: 草案。処理フラグ: GAS実機検証。次FLOW候補: FLOW-04 / FLOW-08。

	C1.2:（B1.1 / 画面入力・GAS通信・失敗処理実装）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.2.md。主所属: C層。parent_id: C1。implements: B1.1; src/Index.html。
		ロジック:
			入力検証、google.script.run、エラー。
		実態:
			状態: 草案。処理フラグ: GAS実機通信確認。次FLOW候補: FLOW-04 / FLOW-08。

	C1.3:（B1.2 / 出力再生状態機械と表示実装）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.3.md。主所属: C層。parent_id: C1。implements: B1.2; src/Index.html。
		ロジック:
			1行再生、タイマー、停止・再開・スキップ。
		実態:
			状態: 草案。処理フラグ: 実ブラウザ再生確認。次FLOW候補: FLOW-04 / FLOW-08。

	C1.4:（B1.3, B1.4 / 餌判定・累積カウンター・進化状態実装）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.4.md。主所属: C層。parent_id: C1。implements: B1.3, B1.4; src/Index.html。
		ロジック:
			classify/tally/stageForは旧実装の閾値3/7/15に対応。A/B新仕様のDNA・4種餌・3段階分岐・完全成熟・色/体積変化は未実装。
		実態:
			状態: 草案。処理フラグ: 進化方式の再設計。次FLOW候補: FLOW-04 / FLOW-08。

	C1.5:（B1.5 / ピクセル生物・餌・進化エフェクト描画実装）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.5.md。主所属: C層。parent_id: C1。implements: B1.5; src/Index.html。
		ロジック:
			Canvasのピクセル描画・餌・進化演出（旧4形態）。新3段階・4種餌・DNA継承・成熟時外見固定は未反映。
		実態:
			状態: 草案。処理フラグ: 描画方法の再設計、GAS実機描画確認。次FLOW候補: FLOW-04 / FLOW-08。

## D: 検証計画

D1:（B1, C1 / FizzBuzzおよび生き物連動の検証計画）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D1.md。verifies: A1.1～A1.5、B1.1～B1.5、C1.1～C1.5。
		テスト: tests/fizzbuzz.test.cjs、tests/creature.test.cjs。
	ロジック:
		既存テスト観点は旧設計を対象。DNAの再現性、4種餌の分類、数論的促進/抑制、3段階、成長上限・成熟時外見固定、成熟後のNまでの継続出力は未計画・未検証。
	実態:
		状態: 草案。新A/B仕様に伴う検証計画更新待ち。GAS実機未検証、npm test未実施。次FLOW候補: FLOW-07 / FLOW-08。

## E: 検証証跡

E1:（D1, C1 / FizzBuzzとレトロ生き物のローカル検証証跡）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E1.md。evidence_for: D1 / C1（既存の集約対象）。
	ロジック:
		既存証跡 FIZZBUZZ-CREATURE-V8-20261013-02 はコミット efc4bc14abaa1e5861d2e8774b205035d3ee240d のコード・テストに対するモック検証。
	実態:
		既存のソース・テストファイルは今回変更なし。新しい分割ノードの検証やGAS実機検証を完了した意味ではない。
		状態: 草案。npm test未実施、GAS実機未検証。次FLOW候補: FLOW-08。

## Manifest処理の区別

- 過去のManifest初期登録: 起点5ノード（A1/B1/C1/D1/E1）と前回分割15子ノードは維持。
- 以前のManifest初期登録: A1.6 / B1.6 の2子ノードを登録済み。今回は新規Node Fileがないため初期登録なし。
- 今回のManifest反映: 既存 A1 / A1.2 / A1.3 / A1.4 / A1.5 / A1.6、B1 / B1.2 / B1.3 / B1.4 / B1.5 / B1.6 の責務・処理フラグ・次FLOWを更新。
- 既存証跡: E1は旧src・旧testsへの限定的なV8モック検証であり、新しいDNA/3段階の検証証跡ではない。
- 未反映の影響: C1/C1.4/C1.5は4形態（LV.0～3）・旧閾値・通常数字は餌なし、D1は旧閾値のテスト計画。新DNA機能に対応するC層ノードも未作成。次FLOWでC/Dを更新する。
- src/・tests/: 今回は変更なし。Core Definition 3ファイルは不変。
- 状態変更: 全Node Fileは草案。承認済み化・デプロイ・公開は行わない。
- 設計上の決定性: NがDNAとFizzBuzz結果双方を定めるため、同じNを再生して得る最終形態は一定。自由選択育成は今回の範囲外。
- 決定済み: 4種餌（栄養3＋調節1）、数字餌は促進/抑制、3段階（魚→陸生→宇宙）、低Nでは途中段階で終了可、完全成熟時に外見固定、FizzBuzzはN行目まで従来形式で継続。
- 仮値・未確定: 成長P=10/35/100、調節効率0.75/1.25、3/5剰余規則、DNA生成式、P算式、形態分岐、色/体積への写像、Lispエイリアンの出現条件。
- NEXT: FLOW-04 成長P・調節因子・ピクセルDNA規則を具体化 → FLOW-06 影響確認 → FLOW-07 C/Dとtestsの更新計画 → FLOW-08 新証跡。
