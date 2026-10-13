# Project Summary Manifest — gas-fizzbuzz-webapp

project_id: gas-fizzbuzz-webapp
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
canonical_path: valis/summary/gas-fizzbuzz-webapp.summary.md
core_definition_mutation: prohibited
current_status: A/B層にDNA・3段階進化の新仕様を記録済み（草案）、C/D/Eは旧実装版
initial_registration_existing: A1, B1, C1, D1, E1
initial_registration_previous_split: A1.1, A1.2, A1.3, A1.4, A1.5, B1.1, B1.2, B1.3, B1.4, B1.5, C1.1, C1.2, C1.3, C1.4, C1.5
initial_registration_this_change: A1.6, B1.6
manifest_reflection_previous_split: A1, B1, C1, D1
manifest_reflection_this_change: A1, A1.1, A1.3, A1.4, A1.5, B1, B1.1, B1.3, B1.4, B1.5
last_reflected_flow: FLOW-05 差分更新・ノード分割
unresolved_summary: DNA生成式・進化段階閾値・分岐規則・色/体積式・ピクセル造形未確定 / C/D新仕様未対応 / GAS実機未検証 / npm test未実行 / 承認済み化なし

## Node構造・参照要約

親子関係: 同一層のID階層による。A1.x→A1、B1.x→B1、C1.x→C1。
層間関係: 括弧内参照元 / derived_from / implements / verifies / evidence_for。層間parent_idは禁止。
従来の15子ノードに加え、今回A1.6/B1.6の2子ノードを新規初期登録する。全ノードは草案。意味参照による層間接続は親子関係としない。

## A: 仕様

A1:（/ FizzBuzz GAS Webアプリ仕様）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A1.md。主所属: A層。参照元なし。
	ロジック:
		6つの仕様条件の親ノード。DNA生成、出力不変、再生、餌、3段階進化、ピクセル表現を分離。
	実態:
		状態: 草案。子ノード6件の親索引。処理フラグ: DNA方式/進化閾値/分岐条件/描画詳細の具体化、C/D未反映、GAS実機未検証。

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
			1行ずつ再生、テキスト不変、一時停止とスキップ。
		実態:
			状態: 草案。処理フラグ: 実機再生確認。次FLOW候補: FLOW-04 / FLOW-08。

	A1.3:（A1 / 出力別の餌と成長入力仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.3.md。主所属: A層。parent_id: A1。related_to: B1.3 / C1.4。
		ロジック:
			Fizz青/Buzz黄/FizzBuzz紫、排他的計数。餌比率→体色、餌総量→体積、蓄積→細部変化。
		実態:
			状態: 草案。処理フラグ: 混色・体積増加式=未確定、C層未反映。次FLOW候補: FLOW-04 / FLOW-07.

	A1.4:（A1 / 生き物の段階進化仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.4.md。主所属: A層。parent_id: A1。related_to: B1.4 / C1.4。
		ロジック:
			3段階（魚→陸生動物→宇宙生物）。DNA+餌蓄積で各段階内の具体形態が分岐。Lispエイリアンは宇宙段階の候補。
		実態:
			状態: 草案。処理フラグ: 新しい2遷移閾値・分岐式は未確定、旧C/Dは4段階。次FLOW候補: FLOW-04 / FLOW-07.

	A1.5:（A1 / 生き物の視覚表現と操作性仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.5.md。主所属: A層。parent_id: A1。related_to: B1.5 / C1.5。
		ロジック:
			ピクセル表現を基本とする。DNAの継承、餌による色・体積、段階による大きな輪郭変化。
		実態:
			状態: 草案。処理フラグ: ピクセル造形・パレット・描画詳細=未確定、C層未反映。次FLOW候補: FLOW-04 / FLOW-07.

	A1.6:（A1 / 入力数値からの初期個体DNA生成仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.6.md。主所属: A層。parent_id: A1。related_to: A1.1 / A1.4 / A1.5。具体化: B1.6。
		ロジック:
			ユーザー入力N全体から再現可能なDNAと魚型の初期個体を決定し、その特徴を進化後へ継承する。
		実態:
			状態: 草案。処理フラグ: DNA生成式・遺伝特徴の定義=未確定、C/D実装・検証=未対応。次FLOW候補: FLOW-04 / FLOW-07。

## B: 機能

B1:（A1 / FizzBuzz算出・再生・生き物機能群）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B1.md。主所属: B層。意味参照元: A1。
	ロジック:
		入力と通信、再生、3種餌集計、3段階の形態分岐、ピクセル描画、初期DNA生成の機能索引。
	実態:
		状態: 草案。子ノード6件の親索引。処理フラグ: DNA式・閾値・分岐条件・描画詳細を具体化、C/D未対応。

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
			自動再生、行出力、一時停止・再開・スキップ。
		実態:
			状態: 草案。処理フラグ: ブラウザ再生確認。次FLOW候補: FLOW-04 / FLOW-08。

	B1.3:（A1.3 / FizzBuzz分類と餌カウント機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.3.md。主所属: B層。parent_id: B1。derived_from: A1.3; implements側: C1.4。
		ロジック:
			3種餌の排他的分類・計数と餌比率計算。
		実態:
			状態: 草案。処理フラグ: 餌演出検討。次FLOW候補: FLOW-04 / FLOW-08。

	B1.4:（A1.4 / 累積餌による進化判定機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.4.md。主所属: B層。parent_id: B1。derived_from: A1.4; implements側: C1.4。
		ロジック:
			DNA+餌蓄積から3段階と段階内の具体形態を判定。色彩/体積/細部の成長パラメータを作る。
		実態:
			状態: 草案。処理フラグ: 新しい進化閾値・形態分岐式未確定、C/D未対応。次FLOW候補: FLOW-04 / FLOW-07.

	B1.5:（A1.5 / 生き物と餌の視覚フィードバック機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.5.md。主所属: B層。parent_id: B1。derived_from: A1.5; implements側: C1.5。
		ロジック:
			DNAの特徴が引き継がれるピクセル姿、餌比率での色、餌総量での体積、3段階の大きな輪郭変化。
		実態:
			状態: 草案。処理フラグ: パーツ設計とC層実装未反映、GAS実機未検証。次FLOW候補: FLOW-04 / FLOW-07.

	B1.6:（A1.6 / 数値シードからのDNA生成・初期個体構築機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.6.md。主所属: B層。parent_id: B1。derived_from: A1.6。related_to: B1.1 / B1.4 / B1.5。
		ロジック:
			同じNから同じDNAを生成し、初期の魚の特徴と段階進化への不変な遺伝情報を提供する。
		実態:
			状態: 草案。処理フラグ: DNAパラメータ・生成式未確定、C層未実装。次FLOW候補: FLOW-04 / FLOW-07。

## C: 実装

C1:（B1 / GAS HTMLサービスとピクセル生き物の実装群）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C1.md。主所属: C層。意味参照元: B1。
	ロジック:
		サーバー・通信・再生・餌進化・Canvas実装を参照する旧版実装の起点。新規DNAと3段階進化は未反映。
	実態:
		状態: 草案。子ノード5件（既存）の親索引。処理フラグ: C1.4/C1.5再設計、DNA機能の新規実装、GAS実機確認。

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
			classify/tally/stageForは旧実装の閾値3/7/15に対応。A/B新仕様のDNA・3段階分岐・色/体積変化は未実装。
		実態:
			状態: 草案。処理フラグ: 進化方式の再設計。次FLOW候補: FLOW-04 / FLOW-08。

	C1.5:（B1.5 / ピクセル生物・餌・進化エフェクト描画実装）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.5.md。主所属: C層。parent_id: C1。implements: B1.5; src/Index.html。
		ロジック:
			Canvasのピクセル描画・餌・進化演出（旧4形態）。新3段階・DNA継承・連続成長の描画は未反映。
		実態:
			状態: 草案。処理フラグ: 描画方法の再設計、GAS実機描画確認。次FLOW候補: FLOW-04 / FLOW-08。

## D: 検証計画

D1:（B1, C1 / FizzBuzzおよび生き物連動の検証計画）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D1.md。verifies: A1.1～A1.5、B1.1～B1.5、C1.1～C1.5。
		テスト: tests/fizzbuzz.test.cjs、tests/creature.test.cjs。
	ロジック:
		既存テスト観点を旧設計の子ノード単位に対応づけた。A1.6/B1.6、DNAの再現性、3段階、色彩・体積、形態分岐は未計画・未検証。
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
- 今回のManifest初期登録: 新規 A1.6 / B1.6 の2子ノード。Node Fileパス・状態・同一層parent_id・意味参照を登録。
- 今回のManifest反映: 既存 A1 / A1.1 / A1.3 / A1.4 / A1.5、B1 / B1.1 / B1.3 / B1.4 / B1.5 の責務・処理フラグ・次FLOWを更新。
- 既存証跡: E1は旧src・旧testsへの限定的なV8モック検証であり、新しいDNA/3段階の検証証跡ではない。
- 未反映の影響: C1/C1.4/C1.5は4形態（LV.0～3）・旧閾値、D1は旧閾値のテスト計画。新DNA機能に対応するC層ノードも未作成。次FLOWでC/Dを更新する。
- src/・tests/: 今回は変更なし。Core Definition 3ファイルは不変。
- 状態変更: 全Node Fileは草案。承認済み化・デプロイ・公開は行わない。
- 設計上の決定性: NがDNAとFizzBuzz結果双方を定めるため、同じNを再生して得る最終形態は一定。自由選択育成は今回の範囲外。
- 未確定: DNA生成式、形態候補、進化閾値、具体分岐、餌→色・体積の写像、Lispエイリアンの出現条件。
- NEXT: FLOW-04 詳細仕様確定 → FLOW-06 影響確認 → FLOW-07 C/Dとtestsへの実装計画 → FLOW-08 新証跡。
