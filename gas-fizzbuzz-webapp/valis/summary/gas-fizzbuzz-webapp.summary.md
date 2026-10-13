# Project Summary Manifest — gas-fizzbuzz-webapp

project_id: gas-fizzbuzz-webapp
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
canonical_path: valis/summary/gas-fizzbuzz-webapp.summary.md
core_definition_mutation: prohibited
current_status: 草案（8-bit Creature版ローカル実装）
initial_registration: A1, B1, C1, D1, E1（既存の初期登録を維持）
last_reflected_flow: FLOW-03 具体化 / FLOW-05 差分更新 / FLOW-08 検証証跡記録（今回の既存ノード更新に対するManifest反映）
unresolved_summary: npm test 未実施 / GAS実環境・公開未検証 / 承認済み化なし

## A: 仕様

A1:（/ FizzBuzz GAS Webアプリ仕様）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A1.md。主所属: A層。参照元なし。
	ロジック:
		1..N の1行1結果を従来どおり出力し、レトロ生き物が出力に同期して成長する。
	実態:
		制約: Nは1～1000の整数。仕様更新は草案、承認済み化なし。次FLOW候補: FLOW-08 / FLOW-09。

## B: 機能

B1:（A1 / 入力値までのFizzBuzz算出・再生・飼育機能）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B1.md。主所属: B層。意味依存: A1。
	ロジック:
		計算結果を1行ずつ自動再生。Fizz青、Buzz黄、FizzBuzz紫の餌を排他的に数え、3/7/15個で進化する。
	実態:
		一時停止・再開・速度・スキップ、低モーション時の最終表示に対応。次FLOW候補: FLOW-08。

## C: 実装

C1:（B1 / GAS HTMLサービスとピクセル生き物の実装）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C1.md。主所属: C層。実装対象: B1。
		実装: src/Code.gs, src/Index.html, src/appsscript.json。
	ロジック:
		Code.gsの返却値・出力形式は無変更。Index.htmlでCanvasピクセル描画・餌飛来・段階進化・自動再生。
	実態:
		GitHub実装反映済み。GASデプロイなし。次FLOW候補: FLOW-08。

## D: 検証計画

D1:（B1, C1 / FizzBuzzおよび生き物連動の検証計画）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D1.md。主所属: D層。
		テスト: tests/fizzbuzz.test.cjs, tests/creature.test.cjs。
	ロジック:
		出力不変、3餌、成長閾値、再生・停止・異常入力・スキップ・低モーションを検証する。
	実態:
		JavaScriptモック環境の検証は E1。npm test（Node実機）は未実施。次FLOW候補: FLOW-08。

## E: 検証証跡

E1:（D1, C1 / FizzBuzzとレトロ生き物のローカル検証証跡）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E1.md。主所属: E層。evidence_for: D1/C1。
	ロジック:
		新証跡 FIZZBUZZ-CREATURE-V8-20261013-02: GitHub commit efc4bc14abaa1e5861d2e8774b205035d3ee240d のソース・テストをV8互換のモック環境で検証。
	実態:
		15テスト成功。証跡の現在有効性: 指定コミットのモック環境ロジック確認に限定。
		旧証跡 FIZZBUZZ-LOCAL-V8-20261013-01: 旧UI対象のため今回のUI版では無効。
		残存処理フラグ: npm test未実施、GAS実機検証未実施、公開未実施。
		次FLOW候補: FLOW-08 / FLOW-09。

## Manifest 状態の区別

- Manifest 初期登録: 過去に実施済み。対象は A1 / B1 / C1 / D1 / E1。今回新規ノードはないため再初期登録しない。
- Manifest 反映: 既存 A1/B1/C1/D1/E1 の責務、参照要約、検証対応、処理フラグ、次FLOW候補を今回更新。
- 構造要約: このファイルはNode File本文や実装/テスト全文を保持しない。
- Node状態: 全て草案。承認済み状態遷移なし。
- 外部副作用: Google Apps Scriptへのデプロイ・公開・権限変更なし。
- NEXT: GAS実環境への導入承認、実機通信検証、Node.js npm test、必要時 FLOW-09。
