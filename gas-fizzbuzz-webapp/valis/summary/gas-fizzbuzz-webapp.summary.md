# Project Summary Manifest — gas-fizzbuzz-webapp

project_id: gas-fizzbuzz-webapp
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
canonical_path: valis/summary/gas-fizzbuzz-webapp.summary.md
core_definition_mutation: prohibited
current_status: A/B/C責務分割済み・全ノード草案
initial_registration_existing: A1, B1, C1, D1, E1
initial_registration_this_change: A1.1, A1.2, A1.3, A1.4, A1.5, B1.1, B1.2, B1.3, B1.4, B1.5, C1.1, C1.2, C1.3, C1.4, C1.5
manifest_reflection_this_change: A1, B1, C1, D1（既存親・検証参照の更新）
last_reflected_flow: FLOW-05 差分更新・ノード分割
unresolved_summary: 進化方式・描画方式の再検討 / GAS実機未検証 / npm test未実行 / 承認済み化なし

## Node構造・参照要約

親子関係: 同一層のID階層による。A1.x→A1、B1.x→B1、C1.x→C1。
層間関係: 括弧内参照元 / derived_from / implements / verifies / evidence_for。層間parent_idは禁止。
15の新規子ノードは全て草案であり、以下がProject Summary Manifestへの初期登録である。

## A: 仕様

A1:（/ / FizzBuzz GAS Webアプリ仕様）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A1.md。主所属: A層。参照元なし。
	ロジック:
		5つの仕様条件の親ノード。出力不変・再生・餌・進化・視覚表現を分離。
	実態:
		状態: 草案。子ノード5件の親索引。処理フラグ: 進化方式と描画方式の検討、GAS実機確認。

	A1.1:（A1 / FizzBuzz入力と出力契約）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.1.md。主所属: A層。parent_id: A1。related_to: B1.1 / C1.1 / C1.2。
		ロジック:
			1～1000整数、1..N、従来どおりのFizzBuzz文字列。
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
			Fizz青/Buzz黄/FizzBuzz紫、排他的計数。
		実態:
			状態: 草案。処理フラグ: 餌演出検討。次FLOW候補: FLOW-04 / FLOW-08。

	A1.4:（A1 / 生き物の段階進化仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.4.md。主所属: A層。parent_id: A1。related_to: B1.4 / C1.4。
		ロジック:
			暫定閾値3/7/15と累積数による4形態。
		実態:
			状態: 草案。処理フラグ: 進化方式を次に検討。次FLOW候補: FLOW-04 / FLOW-08。

	A1.5:（A1 / 生き物の視覚表現と操作性仕様）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/A/A1.5.md。主所属: A層。parent_id: A1。related_to: B1.5 / C1.5。
		ロジック:
			現在のピクセルCanvas方式、餌・進化の演出。
		実態:
			状態: 草案。処理フラグ: 描画方式を次に検討。次FLOW候補: FLOW-04 / FLOW-08。

## B: 機能

B1:（A1 / FizzBuzz算出・再生・生き物機能群）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B1.md。主所属: B層。意味参照元: A1。
	ロジック:
		入力と通信、再生、餌、進化、表示の機能索引。
	実態:
		状態: 草案。子ノード5件の親索引。処理フラグ: 進化・描画の再検討、実機検証。

	B1.1:（A1.1 / 入力検証とGAS計算呼出機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.1.md。主所属: B層。parent_id: B1。derived_from: A1.1; implements側: C1.1 / C1.2。
		ロジック:
			入力・通信・失敗処理。
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
			3種餌の排他的分類・計数。
		実態:
			状態: 草案。処理フラグ: 餌演出検討。次FLOW候補: FLOW-04 / FLOW-08。

	B1.4:（A1.4 / 累積餌による進化判定機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.4.md。主所属: B層。parent_id: B1。derived_from: A1.4; implements側: C1.4。
		ロジック:
			暫定閾値で進化段階を判定。
		実態:
			状態: 草案。処理フラグ: 進化条件を次に検討。次FLOW候補: FLOW-04 / FLOW-08。

	B1.5:（A1.5 / 生き物と餌の視覚フィードバック機能）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B1.5.md。主所属: B層。parent_id: B1。derived_from: A1.5; implements側: C1.5。
		ロジック:
			スプライト・餌・進化演出と表示。
		実態:
			状態: 草案。処理フラグ: 描画方式を次に検討。次FLOW候補: FLOW-04 / FLOW-08。

## C: 実装

C1:（B1 / GAS HTMLサービスとピクセル生き物の実装群）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C1.md。主所属: C層。意味参照元: B1。
	ロジック:
		サーバー・通信・再生・餌進化・Canvas実装を参照する起点。
	実態:
		状態: 草案。子ノード5件の親索引。処理フラグ: 進化ロジック・描画方式検討、GAS実機確認。

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
			classify/tally/stageFor、暫定閾値3/7/15。
		実態:
			状態: 草案。処理フラグ: 進化方式の再設計。次FLOW候補: FLOW-04 / FLOW-08。

	C1.5:（B1.5 / ピクセル生物・餌・進化エフェクト描画実装）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C1.5.md。主所属: C層。parent_id: C1。implements: B1.5; src/Index.html。
		ロジック:
			Canvasのピクセル描画・餌・進化演出。
		実態:
			状態: 草案。処理フラグ: 描画方法の再設計、GAS実機描画確認。次FLOW候補: FLOW-04 / FLOW-08。

## D: 検証計画

D1:（B1, C1 / FizzBuzzおよび生き物連動の検証計画）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D1.md。verifies: A1.1～A1.5、B1.1～B1.5、C1.1～C1.5。
		テスト: tests/fizzbuzz.test.cjs、tests/creature.test.cjs。
	ロジック:
		既存テスト観点を子ノード単位の責務へ対応づけた（出力、再生、分類、進化、描画）。
	実態:
		状態: 草案。GAS実機未検証。npm testは未実施。次FLOW候補: FLOW-07 / FLOW-08。

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

- 以前の初期登録: A1 / B1 / C1 / D1 / E1 は維持。
- 今回のManifest初期登録: 新規A1.1～A1.5、B1.1～B1.5、C1.1～C1.5の15ノードを正本Node Fileへ紐づけた。
- 今回のManifest反映: A1/B1/C1親ノードの責務・子参照と、D1の検証対象の差分を既存登録へ反映。
- 参照上の影響: E1は既存コードバージョンのローカル証跡。新規の分割構造自体に対する検証完了を意味しない。
- src/・tests/: 今回は変更しない。Core Definition 3ファイルは不変。
- 状態変更: すべて草案。承認済み化・デプロイ・公開は行わない。
- 再開条件: 進化方式についてA1.4→B1.4→C1.4、描画方法についてA1.5→B1.5→C1.5を個別に検討。
- NEXT: FLOW-04 修正／FLOW-06 影響範囲探索、必要時 FLOW-07/08。
