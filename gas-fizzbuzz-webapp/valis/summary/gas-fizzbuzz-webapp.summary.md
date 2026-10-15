# Project Summary Manifest — gas-fizzbuzz-webapp

project_id: gas-fizzbuzz-webapp
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
canonical_path: valis/summary/gas-fizzbuzz-webapp.summary.md
core_definition_mutation: prohibited
current_status: 全111ノード（A9/B13/C21/D12/E56）を草案に統一。旧承認は無効、今回の定義変更も自動承認しない。
definition_baseline: phase-continuity-2026-10-15。operations/plans/2026-10-15-phase-continuity.md。
initial_registration_this_change: E55/E56。機能責務の追加分割なし。
manifest_reflection_this_change: A1.4、A1.5、B1.4.2、C1.4.3、D1.2、D1.3.2。第三相の身体連続性/版付き方針/検証計画と処理フラグを反映。
approval_basis: 全FizzBuzzノード草案という利用者指示を維持。既存責務/変更単位で今回指示を具体化。
unresolved_summary: 利用者Windows10/11実機の倍率/FPSと美術受入は未認定。
evidence_scope: 今回app1.11.0はE55（ローカル）/E56（hosted Windows）。E1〜E54は各旧対象版/環境限定。

## 読解経路と責務

ID階層/parent_idは同一層だけ。層間はderived_from/implements/verifies/evidence_for。1ノード1ファイル、A〜Eを同数化しない。具体仕様はA/B、実装はC/src、検証観点はD/tests、対象版/環境/実結果はE/operationsを読む。srcは実装に必要なファイルだけ。

## A

A1:（ / Windows FizzBuzz生物育成アプリ統合仕様）［草案］
	Node File: valis/nodes/A/A1.md。独立起点、parent_idなし。
	要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	A1.1:（A1 / 入力整数とローカルFizzBuzz出力契約）［草案］
		Node File: valis/nodes/A/A1.1.md。parent_id: A1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	A1.2:（A1 / 出力・摂取・実個体の同期再生仕様）［草案］
		Node File: valis/nodes/A/A1.2.md。parent_id: A1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	A1.3:（A1 / 4種energyの摂取・調節・色彩と体積仕様）［草案］
		Node File: valis/nodes/A/A1.3.md。parent_id: A1（同一層）。
		要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

	A1.4:（A1 / 三形態の成長・系統分岐と条件覚醒仕様）［草案］
		Node File: valis/nodes/A/A1.4.md。parent_id: A1（同一層）。
		要約: 第三相の身体連続性/版付き方針の該当責務はNode本文。今回app1.11.0はE55（ローカル）/E56（hosted Windows）。次FLOW: FLOW-07/08/05。

	A1.5:（A1 / DNA身体と複数部位成長・観測表示仕様）［草案］
		Node File: valis/nodes/A/A1.5.md。parent_id: A1（同一層）。
		要約: 第三相の身体連続性/版付き方針の該当責務はNode本文。今回app1.11.0はE55（ローカル）/E56（hosted Windows）。次FLOW: FLOW-07/08/05。

	A1.6:（A1 / 入力Nからの不変DNAと初期個体仕様）［草案］
		Node File: valis/nodes/A/A1.6.md。parent_id: A1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	A1.7:（A1 / Windows即起動配布とローカル画像仕様）［草案］
		Node File: valis/nodes/A/A1.7.md。parent_id: A1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	A1.8:（A1 / 起動中だけの最終結果図鑑）［草案］
		Node File: valis/nodes/A/A1.8.md。parent_id: A1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。


## B

B1:（A1 / Windows生物育成の機能接合索引）［草案］
	Node File: valis/nodes/B/B1.md。独立起点、parent_idなし。
	要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	B1.1:（A1.1 / 入力検証とローカルFizzBuzz列生成機能）［草案］
		Node File: valis/nodes/B/B1.1.md。parent_id: B1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	B1.2:（A1.2 / 行・energy同期再生と完走操作機能）［草案］
		Node File: valis/nodes/B/B1.2.md。parent_id: B1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	B1.3:（A1.3 / 4energy分類・摂取集計・数字調節機能）［草案］
		Node File: valis/nodes/B/B1.3.md。parent_id: B1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	B1.4:（A1.4, A1.3, A1.6 / 全体成長と部位発現・相遷移の接合機能）［草案］
		Node File: valis/nodes/B/B1.4.md。parent_id: B1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		B1.4.1:（B1.4, A1.3, A1.4, A1.6 / 整数energy較正とDNA部位発現機能）［草案］
			Node File: valis/nodes/B/B1.4.1.md。parent_id: B1.4（同一層）。
			要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		B1.4.2:（B1.4, A1.4 / 相入口分岐・条件覚醒・全器官継承と覚醒後固定機能）［草案］
			Node File: valis/nodes/B/B1.4.2.md。parent_id: B1.4（同一層）。
			要約: 第三相の身体連続性/版付き方針の該当責務はNode本文。今回app1.11.0はE55（ローカル）/E56（hosted Windows）。次FLOW: FLOW-07/08/05。

	B1.5:（A1.5, A1.3, A1.6 / 独立PNG部位の成長描画・摂取観測機能）［草案］
		Node File: valis/nodes/B/B1.5.md。parent_id: B1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

		B1.5.1:（A1.3, A1.5 / 摂取数の節目による生体反応機能）［草案］
			Node File: valis/nodes/B/B1.5.1.md。parent_id: B1.5（同一層）。
			要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

		B1.5.2:（A1.5, A1.3 / 事前環境配分による生息背景機能）［草案］
			Node File: valis/nodes/B/B1.5.2.md。parent_id: B1.5（同一層）。
			要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

	B1.6:（A1.6 / N全体のDNA生成と出生前個体構築機能）［草案］
		Node File: valis/nodes/B/B1.6.md。parent_id: B1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	B1.7:（A1.7 / 同梱desktop起動・画像解決機能）［草案］
		Node File: valis/nodes/B/B1.7.md。parent_id: B1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	B1.8:（A1.8 / 起動中だけの最終結果図鑑）［草案］
		Node File: valis/nodes/B/B1.8.md。parent_id: B1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。


## C

C1:（B1 / desktop実装の接合索引）［草案］
	Node File: valis/nodes/C/C1.md。独立起点、parent_idなし。
	要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	C1.1:（B1.1, A1.1 / ローカルFizzBuzz列算出実装）［草案］
		Node File: valis/nodes/C/C1.1.md。parent_id: C1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	C1.2:（B1.1, A1.1, A1.6 / N入力・出生前同期・エラー表示実装）［草案］
		Node File: valis/nodes/C/C1.2.md。parent_id: C1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	C1.3:（B1.2, A1.2 / 行消費・摂取同期・再生状態実装）［草案］
		Node File: valis/nodes/C/C1.3.md。parent_id: C1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	C1.4:（B1.3, B1.4 / 分類・較正・部位発現・相遷移の実装接合）［草案］
		Node File: valis/nodes/C/C1.4.md。parent_id: C1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.4.1:（B1.3, A1.3 / 4energy排他分類と数字調節実装）［草案］
			Node File: valis/nodes/C/C1.4.1.md。parent_id: C1.4（同一層）。
			要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.4.2:（B1.4.1, A1.3, A1.4, A1.6 / 整数quarters較正とDNA部位発現実装）［草案］
			Node File: valis/nodes/C/C1.4.2.md。parent_id: C1.4（同一層）。
			要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.4.3:（B1.4.2, A1.4 / 相入口分岐と第四相覚醒・全器官継承・成熟実装）［草案］
			Node File: valis/nodes/C/C1.4.3.md。parent_id: C1.4（同一層）。
			要約: 第三相の身体連続性/版付き方針の該当責務はNode本文。今回app1.11.0はE55（ローカル）/E56（hosted Windows）。次FLOW: FLOW-07/08/05。

	C1.5:（B1.5, A1.5 / DNA身体・部位・energyの共通レンダラ実装）［草案］
		Node File: valis/nodes/C/C1.5.md。parent_id: C1（同一層）。
		要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.5.1:（B1.5, B1.7 / ローカル画像設定とdesktop表示入口の同期実装）［草案］
			Node File: valis/nodes/C/C1.5.1.md。parent_id: C1.5（同一層）。
			要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.5.2:（B1.5, A1.5 / 原本保全とDNA身体・成長器官資産の接合）［草案］
			Node File: valis/nodes/C/C1.5.2.md。parent_id: C1.5（同一層）。
			要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

			C1.5.2.1:（C1.5.2, B1.5, B1.6 / DNA共通身体部位PNGと結合metadata実装）［草案］
				Node File: valis/nodes/C/C1.5.2.1.md。parent_id: C1.5.2（同一層）。
				要約: 自然な反応/背景統合/描画・UI・保存最適化の該当責務はNode本文。今回ローカル実結果E43、hosted Windows実結果E44。利用者受入は未認定。次FLOW: FLOW-08/05。

			C1.5.2.2:（C1.5.2, B1.5, B1.4.2 / 20系統の解剖に沿う多部位成長PNG実装）［草案］
				Node File: valis/nodes/C/C1.5.2.2.md。parent_id: C1.5.2（同一層）。
				要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

			C1.5.2.3:（B1.5.1, C1.5.2 / 複数種類の生態餌PNGと配置metadata実装）［草案］
				Node File: valis/nodes/C/C1.5.2.3.md。parent_id: C1.5.2（同一層）。
				要約: 環境別生命/source接地/背景粒子の該当責務はNode本文。今回ローカル実結果E51、hosted Windows実結果E52。利用者受入は未認定。次FLOW: FLOW-08/05。

			C1.5.2.4:（B1.5.2, C1.5.2 / 深海・熱圏・情報域・虚空の背景PNG実装）［草案］
				Node File: valis/nodes/C/C1.5.2.4.md。parent_id: C1.5.2（同一層）。
				要約: 生態世界の材質/植生/餌/有界描画の該当責務はNode本文。今回ローカル実結果E45、hosted Windows実結果E46。利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.5.3:（B1.5, B1.2, B1.8 / 実個体の観測・摂取・結果・履歴UI実装）［草案］
			Node File: valis/nodes/C/C1.5.3.md。parent_id: C1.5（同一層）。
			要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.5.4:（B1.5.1, A1.3 / 摂取数の節目と口・足元・感覚器反応実装）［草案］
			Node File: valis/nodes/C/C1.5.4.md。parent_id: C1.5（同一層）。
			要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

		C1.5.5:（B1.5.2, A1.5 / 環境背景の合成描画実装）［草案］
			Node File: valis/nodes/C/C1.5.5.md。parent_id: C1.5（同一層）。
			要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

	C1.6:（B1.6, A1.6 / 不変6DNA生成と身体・部位素質写像実装）［草案］
		Node File: valis/nodes/C/C1.6.md。parent_id: C1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	C1.7:（B1.7, A1.7 / Electron起動・同梱配布・ローカル資産ホスト実装）［草案］
		Node File: valis/nodes/C/C1.7.md。parent_id: C1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	C1.8:（B1.8, A1.8 / 起動中だけの最終結果図鑑）［草案］
		Node File: valis/nodes/C/C1.8.md。parent_id: C1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。


## D

D1:（A1, B1, C1 / desktop育成・配布・記録の検証接合）［草案］
	Node File: valis/nodes/D/D1.md。独立起点、parent_idなし。
	要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	D1.1:（A1.1, A1.2, B1.1, B1.2, C1.1, C1.3 / ローカル原列・N件出力の回帰計画）［草案］
		Node File: valis/nodes/D/D1.1.md。parent_id: D1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	D1.2:（A1.3, A1.4, A1.6, B1.3, B1.4, B1.6, C1.4, C1.6 / DNA・quarters較正・部位発現・全継承の検証計画）［草案］
		Node File: valis/nodes/D/D1.2.md。parent_id: D1（同一層）。
		要約: 第三相の身体連続性/版付き方針の該当責務はNode本文。今回app1.11.0はE55（ローカル）/E56（hosted Windows）。次FLOW: FLOW-07/08/05。

	D1.3:（A1.2, A1.5, B1.2, B1.5, C1.3, C1.5 / ローカル画像・観測・再生の検証接合）［草案］
		Node File: valis/nodes/D/D1.3.md。parent_id: D1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		D1.3.1:（C1.5.1, C1.7, B1.7 / desktop入口・編集モジュール・ローカルPNG同期計画）［草案］
			Node File: valis/nodes/D/D1.3.1.md。parent_id: D1.3（同一層）。
			要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

		D1.3.2:（A1.5, B1.5, C1.5.2, C1.5 / DNA身体・系統多部位PNG・原モック照合計画）［草案］
			Node File: valis/nodes/D/D1.3.2.md。parent_id: D1.3（同一層）。
			要約: 第三相の身体連続性/版付き方針の該当責務はNode本文。今回app1.11.0はE55（ローカル）/E56（hosted Windows）。次FLOW: FLOW-07/08/05。

		D1.3.3:（A1.2, A1.5, A1.8, B1.2, B1.5, C1.5.3 / 摂取・遺伝表示・実run観測UI検証計画）［草案］
			Node File: valis/nodes/D/D1.3.3.md。parent_id: D1.3（同一層）。
			要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

		D1.3.4:（B1.5.1, C1.5.4, C1.5.2.3 / 摂取の節目・生体反応・非増殖検証計画）［草案］
			Node File: valis/nodes/D/D1.3.4.md。parent_id: D1.3（同一層）。
			要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

		D1.3.5:（B1.5.2, C1.5.5, C1.5.2.4 / 環境背景・配分・遷移・主役可読性検証計画）［草案］
			Node File: valis/nodes/D/D1.3.5.md。parent_id: D1.3（同一層）。
			要約: 向き/光/接地/連続描画の該当責務はNode本文。今回ローカル実結果E53、hosted Windows実結果E54。利用者受入は未認定。次FLOW: FLOW-08/05。

	D1.4:（A1.5, C1.5, C1.5.3 / 実利用の画質・視認性・性能受入計画）［草案］
		Node File: valis/nodes/D/D1.4.md。parent_id: D1（同一層）。
		要約: 責務/具体仕様/可変部/検証観点はNode本文へ。旧app1.4.1対象の実結果はE35（ローカル）/E36（hosted Windows）。 利用者受入は未認定。次FLOW: FLOW-08/05。

	D1.5:（A1.7, B1.7, C1.7 / Windows配布・同梱資産・単独起動検証計画）［草案］
		Node File: valis/nodes/D/D1.5.md。parent_id: D1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。

	D1.6:（A1.8, B1.8, C1.8, C1.5.3 / 起動中だけの最終結果図鑑）［草案］
		Node File: valis/nodes/D/D1.6.md。parent_id: D1（同一層）。
		要約: 操作応答/反応/起動中図鑑の該当責務はNode本文。今回ローカル実結果E47、hosted Windows実結果E48。利用者受入は未認定。次FLOW: FLOW-08/05。


## E

E1:（D1, C1 / FizzBuzz とレトロ生き物のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E1.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E2:（D1.1, D1.2, D1.3 / 新4種餌・DNA・進化・成熟のV8ローカル検証証跡）［草案］
	Node File: valis/nodes/E/E2.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E3:（D1.1, D1.2, D1.3 / 進化別ピクセル描画・最終形態提示のV8モック検証証跡）［草案］
	Node File: valis/nodes/E/E3.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E4:（D1.1, D1.2, D1.3 / ゲームリザルト二画面UI・FizzBuzz出力回帰のV8モック検証証跡）［草案］
	Node File: valis/nodes/E/E4.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E5:（D1.1, D1.2, D1.3 / 初期DNA差分・分岐・成長の視認性改善に関するV8モック証跡）［草案］
	Node File: valis/nodes/E/E5.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E6:（D1.1, D1.2, D1.3 / 有機Canvas描画と3系統特化成長のV8モック検証証跡）［草案］
	Node File: valis/nodes/E/E6.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E7:（D1.1, D1.2, D1.3 / 環境依存分岐と交差変容・中立的な相名のV8モック検証）［草案］
	Node File: valis/nodes/E/E7.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E8:（D1.1, D1.2, D1.3 / 造形の系譜継承と段階的変容のV8モック証跡）［草案］
	Node File: valis/nodes/E/E8.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E9:（D1.1, D1.2, D1.3 / 64×64ドット描画・12状況分岐系統・進化先図鑑のV8モック証跡）［草案］
	Node File: valis/nodes/E/E9.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E10:（D1.1, D1.2, D1.3 / 不変コア・12アンカー・11パーツ蓄積・14系統のV8互換モック証跡）［草案］
	Node File: valis/nodes/E/E10.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E11:（D1.2, D1.3, C1.5 / 画像合成v3の実Node・Chromium限定検証証跡）［草案］
	Node File: valis/nodes/E/E11.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E12:（D1.2, D1.3, C1.4.3, C1.5 / 14系統画像合成本流統合・環境誘導の限定証跡）［草案］
	Node File: valis/nodes/E/E12.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E13:（D1.3, C1.5 / v4.2肖像二重描画防止と再抽出24点の限定検証証跡）［草案］
	Node File: valis/nodes/E/E13.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E14:（D1.3.1, C1.5.1 / v4.2実行HTML同期とV8限定動作照合の証跡）［草案］
	Node File: valis/nodes/E/E14.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E15:（D1.3.1/D1.3.2/D1.3.3 / GitHub版実Node・Chromium検証の限定証跡）［草案］
	Node File: valis/nodes/E/E15.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E16:（D1.3.2, C1.5.2 / 草案状態とGitモック配置整合の検証証跡）［草案］
	Node File: valis/nodes/E/E16.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E17:（D1.3.2, D1.3.3, C1.5.2, C1.5.3 / 観測UIと深海・神鳥アトラスの実検証証跡）［草案］
	Node File: valis/nodes/E/E17.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E18:（D1.3.2, D1.3.3, C1.5.1, C1.5.2, C1.5.3 / 全12器官PNGとsrc単独配布の実検証証跡）［草案］
	Node File: valis/nodes/E/E18.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E19:（D1.3.2, D1.3.3, C1.5.1, C1.5.2 / src実装専用化と描画同一性の実検証証跡）［草案］
	Node File: valis/nodes/E/E19.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E20:（D1.1, D1.2, D1.3, D1.3.1, D1.3.2, D1.3.3, A1, B1, C1 / モック・ノード・現行実装の適合監査証跡）［草案］
	Node File: valis/nodes/E/E20.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E21:（D1.1, D1.2, D1.3.1, D1.3.2, D1.3.3, D1.5, D1.6, C1 / Windows移行版の計算・画像・実履歴・配布照合証跡）［草案］
	Node File: valis/nodes/E/E21.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E22:（D1.5, D1.6, C1.7, C1.8 / GitHub Windows配布・実exe起動と再起動の証跡）［草案］
	Node File: valis/nodes/E/E22.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E23:（D1.1, D1.2, D1.3.1, D1.3.2, D1.3.3, D1.5, D1.6, C1 / 数字入力進化版の限定検証証跡）［草案］
	Node File: valis/nodes/E/E23.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E24:（D1.5, D1.6, C1.7, C1.8 / 数字入力進化版Windows配布・実exe起動と再起動証跡）［草案］
	Node File: valis/nodes/E/E24.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E25:（D1.1, D1.2, D1.3.2, D1.3.3, D1.5, D1.6, C1 / 一体化生体・手動開始・第四相版のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E25.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E26:（D1.5, D1.6, C1 / 一体化生体版Windows配布・実exe起動と復元証跡）［草案］
	Node File: valis/nodes/E/E26.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E27:（D1.1, D1.2, D1.3.1, D1.3.2, D1.3.3, D1.5, D1.6, C1 / 解剖別四段階・20系統最終形態のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E27.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E28:（D1.5, D1.6, C1 / 解剖別四段階版Windows配布・実exe起動復元証跡）［草案］
	Node File: valis/nodes/E/E28.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E29:（D1.2, D1.3.2, D1.6, C1.5, C1.4.3, C1.8 / 系統輪郭・体表接続revision2のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E29.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E30:（D1.5, D1.6, C1.5, C1.8, C1.7 / 系統輪郭revision2のWindows実exe配布・復元証跡）［草案］
	Node File: valis/nodes/E/E30.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E31:（D1.3.2, D1.3.3, D1.5, D1.6, C1.5, C1.5.3 / 系統別生体運動・摂取反応のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E31.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E32:（D1.5, D1.6, D1.3.2, C1.5, C1.7 / 生体運動版Windows実exe配布・保存復元証跡）［草案］
	Node File: valis/nodes/E/E32.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E33:（D1.2, D1.3.2, D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5 / 一体化造形・条件覚醒・生態描画のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E33.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E34:（D1.5, D1.6, D1.3.2, C1.5, C1.7 / 生態造形版Windows実exe配布・保存復元証跡）［草案］
	Node File: valis/nodes/E/E34.md。独立起点、parent_idなし。
	要約: 旧指定対象版/環境に限定した実証。今回版へ転用しない。 利用者受入は未認定。次FLOW: FLOW-08/05。

E35:（D1.1, D1.3.3, D1.3.4, D1.5, C1.5.3, C1.5.4 / 行同期給餌・常時出力・可読再生のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E35.md。独立起点、parent_idなし。
	要約: 今回版の対象/環境/実結果と未実施はNode本文へ。 利用者受入は未認定。次FLOW: FLOW-08/05。

E36:（D1.1, D1.3.3, D1.3.4, D1.5, D1.6, C1.5.3, C1.5.4 / 行同期給餌版Windows実exe・常時表示・保存復元証跡）［草案］
	Node File: valis/nodes/E/E36.md。独立起点、parent_idなし。
	要約: 今回版の対象/環境/実結果と未実施はNode本文へ。 利用者受入は未認定。次FLOW: FLOW-08/05。

E37:（D1.3.3, D1.3.4, D1.3.5, D1.5, C1.5, C1.5.4, C1.5.5 / 4種資源と身体型別取り込みのローカル検証証跡）［草案］
	Node File: valis/nodes/E/E37.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.3.5/D1.5。
	要約: app1.4.2。単体53、実画面144、生態/運動220、実Electron21/15、Windowsクロス配布/ZIP74照合に限定成功。入力SHA/原列同期/画像/動画はoperations/evidence/resource-intake。hosted Windows実exeはE38。利用者受入は未認定。次FLOW: FLOW-08/05。

E38:（D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.4, C1.5.5 / 4種資源版Windows実exe・配布・保存復元証跡）［草案］
	Node File: valis/nodes/E/E38.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.4.2のrun38692377848/job116281032724でsource/assets/配布/ZIP全照合/実exe作成・再起動の無条件step成功を対象commitと照合。詳細はoperations/evidence/resource-intake/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E39:（D1.3.3, D1.3.4, D1.3.5, D1.5, C1.5, C1.5.4, C1.5.5 / 蓄積背景・節目反応・倍速のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E39.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.3.5/D1.5。
	要約: app1.4.3。単体53、実画面145、生体/生態219、実Electron21/15、Windowsクロス配布/ZIP74照合に限定成功。入力SHA/原列/画像/動画はoperations/evidence/accumulated-ecology。hosted Windows実exeはE40。利用者受入は未認定。次FLOW: FLOW-08/05。

E40:（D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.4, C1.5.5 / 蓄積背景版Windows実exe・配布・保存復元証跡）［草案］
	Node File: valis/nodes/E/E40.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.4.3のrun38695116770/job116289766042でsource/assets/配布/ZIP全照合/実exe作成・再起動の無条件step成功を対象commitと照合。詳細はoperations/evidence/accumulated-ecology/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E41:（D1.3.2, D1.3.3, D1.3.4, D1.3.5, D1.5, C1.5, C1.5.2.1, C1.5.2.4 / 顎・発光・生態群生ブラッシュアップのローカル検証証跡）［草案］
	Node File: valis/nodes/E/E41.md。独立証跡、parent_idなし。evidence_for: D1.3.2/D1.3.3/D1.3.4/D1.3.5/D1.5。
	要約: app1.5.0。単体55、実画面145、生体/生態299と全160コマ、実Electron21/15、Windowsクロス配布/ZIP74照合に限定成功。入力SHA/画像/動画はoperations/evidence/ecology-polish。hosted Windows実exeはE42。利用者受入は未認定。次FLOW: FLOW-08/05。

E42:（D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.4, C1.5.5 / 生態造形版Windows実exe・配布・保存復元証跡）［草案］
	Node File: valis/nodes/E/E42.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.5.0のrun38700518068/job116307305309でsource/assets/配布/ZIP全照合/実exe作成・再起動の無条件step成功を対象commitと照合。詳細はoperations/evidence/ecology-polish/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E43:（D1.3.2, D1.3.3, D1.3.4, D1.3.5, D1.5, C1.3, C1.5 / 自然な摂取・背景統合・停止対策のローカル検証証跡）［草案］
	Node File: valis/nodes/E/E43.md。独立証跡、parent_idなし。evidence_for: D1.3.2/D1.3.3/D1.3.4/D1.3.5/D1.5。
	要約: app1.5.1。単体56、実画面145、生体/生態319、性能/保存34と全160コマ、実Electron21/15、クロス配布/ZIP74照合に限定成功。詳細はoperations/evidence/natural-ecology。初回素材準備に短い負荷が残る。hosted Windows実exeはE44。利用者受入は未認定。次FLOW: FLOW-08/05。

E44:（D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.4, C1.5.5 / 自然反応・最適化版Windows実exe・配布・保存復元証跡）［草案］
	Node File: valis/nodes/E/E44.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.5.1のrun38705531881/job116323882110でsource/assets/配布/ZIP全照合/実exe作成・再起動の無条件step成功を対象commitと照合。詳細はoperations/evidence/natural-ecology/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E45:（D1.3.2, D1.3.3, D1.3.4, D1.3.5, D1.5, C1.5, C1.5.2.4, C1.5.5 / 生態世界の材質・植生・生命餌の美術強化ローカル証跡）［草案］
	Node File: valis/nodes/E/E45.md。独立証跡、parent_idなし。evidence_for: D1.3.2/D1.3.3/D1.3.4/D1.3.5/D1.5。
	要約: app1.6.0。単体60、画面145、生体/生態319、性能/保存35、美術85・80制御場面、実Electron21/15、クロス配布/67PNG/ZIP74照合に限定成功。詳細はoperations/evidence/art-direction。初回素材準備に短い負荷が残る。hosted Windows実exeはE46。利用者受入は未認定。次FLOW: FLOW-08/05。

E46:（D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.4, C1.5.5 / 生態世界美術強化版Windows実exe・配布・保存復元証跡）［草案］
	Node File: valis/nodes/E/E46.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.6.0のrun38727120662/job116395626376でsource/assets/配布/ZIP全照合/実exe作成・再起動の無条件step成功を対象commitと照合。詳細はoperations/evidence/art-direction/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E47:（D1.3.3, D1.3.4, D1.5, D1.6, C1.3, C1.5, C1.8 / 操作応答・全身摂取と成長反応・起動中図鑑ローカル証跡）［草案］
	Node File: valis/nodes/E/E47.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.5/D1.6。
	要約: app1.7.0。単体65、画面148、生体345、性能33、美術85・80制御場面、実操作23、実Electron21/9、67PNG/ZIP74照合に限定成功。詳細はoperations/evidence/responsive-reactions。hosted Windows実exeはE48。利用者受入は未認定。次FLOW: FLOW-08/05。

E48:（D1.3.3, D1.3.4, D1.5, D1.6, C1.7, C1.8 / 全身反応・起動中図鑑版Windows実exe・配布証跡）［草案］
	Node File: valis/nodes/E/E48.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.5/D1.6。
	要約: app1.7.0 run38731549170/job116410284660でsource/assets/配布/ZIP全照合/実exe完走2結果と次プロセス図鑑空/旧history不変を対象commitと照合。詳細はoperations/evidence/responsive-reactions/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E49:（D1.3.2, D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.5 / 生態・動き・陰影仕上げローカル証跡）［草案］
	Node File: valis/nodes/E/E49.md。独立証跡、parent_idなし。evidence_for: D1.3.2/D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.8.0。単体70、画面148、生体345、性能33、美術85、操作23、仕上げ70、実Electron21/9、67PNG/ZIP74に限定成功。詳細はoperations/evidence/ecology-finish。hosted Windows実exeはE50。利用者受入は未認定。次FLOW: FLOW-08/05。

E50:（D1.3.3, D1.3.4, D1.5, D1.6, C1.7, C1.8 / 生態・動き・陰影仕上げ版Windows実exe・配布証跡）［草案］
	Node File: valis/nodes/E/E50.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.5/D1.6。
	要約: app1.8.0 run38735695711/job116424304480でsource/assets/配布/ZIP全照合/実exe完走2結果と次プロセス図鑑空/旧history不変を対象commitと照合。詳細はoperations/evidence/ecology-finish/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E51:（D1.3.2, D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.5, C1.5.2.3 / 環境別生命・実source接地のローカル証跡）［草案］
	Node File: valis/nodes/E/E51.md。独立証跡、parent_idなし。evidence_for: D1.3.2/D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.9.0。単体72、画面148、生体345、性能33、美術85、操作23、仕上げ78、native21/9。新生命24姿勢/実接地64コマ/68PNG・89src/ZIP74。詳細はoperations/evidence/biome-presence。hosted WindowsはE52。利用者受入は未認定。次FLOW: FLOW-08/05。

E52:（D1.3.3, D1.3.4, D1.5, D1.6, C1.7, C1.8 / 環境別生命・実source接地版Windows実exe・配布証跡）［草案］
	Node File: valis/nodes/E/E52.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.5/D1.6。
	要約: app1.9.0 run38740083540/job116439179326でsource/assets/配布/ZIP全照合/実exe完走2結果と次プロセス図鑑空/旧history不変を対象commitと照合。詳細はoperations/evidence/biome-presence/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E53:（D1.3.2, D1.3.3, D1.3.4, D1.3.5, D1.5, D1.6, C1.5, C1.5.4, C1.5.5 / 向き・体内光・接地影と連続描画のローカル証跡）［草案］
	Node File: valis/nodes/E/E53.md。独立証跡、parent_idなし。evidence_for: D1.3.2/D1.3.3/D1.3.4/D1.3.5/D1.5/D1.6。
	要約: app1.10.0。単体75、画面148、生体345、性能38、美術85、操作23、仕上げ86、native21/9。向き/種別運動/光起点/浮遊反射なし/静動影一致、連続71行のCPUとcache/68PNG・89src/ZIP74。詳細はoperations/evidence/ecological-cohesion。hosted WindowsはE54。利用者受入は未認定。次FLOW: FLOW-08/05。

E54:（D1.3.3, D1.3.4, D1.5, D1.6, C1.7, C1.8 / 向き・体内光・接地影改良版Windows実exe・配布証跡）［草案］
	Node File: valis/nodes/E/E54.md。独立証跡、parent_idなし。evidence_for: D1.3.3/D1.3.4/D1.5/D1.6。
	要約: app1.10.0 run38744255087/job116453614681でsource/assets/配布/ZIP全照合/実exe完走2結果と次プロセス空/旧history不変を対象commitと照合。詳細はoperations/evidence/ecological-cohesion/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。

E55:（D1.2, D1.3.2, C1.4.3 / 第三相の身体連続性ローカル証跡）［草案］
	Node File: valis/nodes/E/E55.md。独立証跡、parent_idなし。evidence_for: D1.2/D1.3.2。
	要約: app1.11.0。全421入力の身体型保持/同型145分岐/20覚醒到達、N932と5実画像比較、旧版互換。単体78/画面148/生体345/性能38/美術85/操作23/仕上げ102/native21・9/ZIP74。詳細はoperations/evidence/phase-continuity。hosted WindowsはE56。利用者受入は未認定。次FLOW: FLOW-08/05。

E56:（D1.2, D1.3.2, D1.5, D1.6, C1.4.3 / 身体連続性版Windows実exe・配布証跡）［草案］
	Node File: valis/nodes/E/E56.md。独立証跡、parent_idなし。evidence_for: D1.2/D1.3.2/D1.5/D1.6。
	要約: app1.11.0 run38752527062/job116482333322でsource/assets/配布/ZIP全照合/実exe完走2結果と次プロセス空/旧history不変を対象commitと照合。詳細はoperations/evidence/phase-continuity/windows-ci-public-summary.json。利用者Windows10/11実機と美術受入は未認定。次FLOW: FLOW-08/05。
