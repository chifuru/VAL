# Hello VALIS — Project Summary Manifest
project_id: hello-valis
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
core_definition_mutation: prohibited
canonical_path: valis/summary/hello-valis.summary.md
project_root: hello-valis/
current_status: 最小責務分割済み。コード不変。実ブラウザ・GAS確認待ち。
Manifest 初期登録: 今回 B2, C2, D2, D3, E2 を追加。既存 A1, B1, C1, D1, E1 を保持。
Manifest 反映: FLOW-05。B1/C1/D1/E1の責務縮小と層間参照・検証対応・証跡有効範囲を更新。
分割方針: 同一層内で独立する責務を兄弟ノードとする。全ノードparent_id:null。集約専用の親は増やさない。
閲覧: 指定メンバーのみ。GAS実行・アクセス設定の確認はユーザー担当（D3）。
作業手順: operations/plans/hello-valis.md
残存処理: D2ブラウザ環境準備・描画確認、D3実環境結果受領。
次FLOW候補: 検証結果取得後FLOW-08。

A1:（なし / 電子空間の知性と交信）［草案］
	構成（要素・関係）:
		valis/nodes/A/A1.md。parent_id: null。
	ロジック:
		世界観・可読性・限定閲覧の上位条件。B1/B2へ具体化。
	実態:
		変更なし。実環境の確認待ち。

B1:（A1, B2 / 電子生態系と刺激応答）［草案］
	構成（要素・関係）:
		valis/nodes/B/B1.md。parent_id: null。derived_from: [A1]。 related_to: [B2]
	ロジック:
		粒子・刺激応答。B2へ活性度と返答を伝える。
	実態:
		状態証跡E2。描画D2、実環境D3は待ち。

B2:（A1, B1 / Hello VALISの文字表現）［草案］
	構成（要素・関係）:
		valis/nodes/B/B2.md。parent_id: null。derived_from: [A1]。 related_to: [B1]
	ロジック:
		時間とB1の入力から文字を変化させる。
	実態:
		位相証跡E2。視覚確認D2は待ち。

C1:（B1, B2, C2 / GAS配信）［草案］
	構成（要素・関係）:
		valis/nodes/C/C1.md。parent_id: null。implements: [B1, B2]。 related_to: [C2]
	ロジック:
		src/Code.gsでC2のHTMLをGAS配信。
	実態:
		配信スタブE1有効。実環境D3は待ち。

C2:（B1, B2, C1 / ブラウザ側の交信体験）［草案］
	構成（要素・関係）:
		valis/nodes/C/C2.md。parent_id: null。implements: [B1, B2]。 related_to: [C1]
	ロジック:
		src/Index.htmlで状態・描画・入力を接続。
	実態:
		状態スタブE2有効。ブラウザD2は待ち。

D1:（A1, B1, B2, C1, C2 / ローカル機能確認）［草案］
	構成（要素・関係）:
		valis/nodes/D/D1.md。parent_id: null。verifies: [A1, B1, B2, C1, C2]
	ロジック:
		tests/hello-valis.test.cjs、tests/state.test.cjs。
	実態:
		E1/E2成功。今回再実行なし。

D2:（A1, B1, B2, C2 / ブラウザ体験確認）［草案］
	構成（要素・関係）:
		valis/nodes/D/D2.md。parent_id: null。verifies: [A1, B1, B2, C2]
	ロジック:
		tests/experience.test.cjsと目視確認。
	実態:
		Chromium不足。成功証跡なし。

D3:（A1, B1, B2, C1, C2 / GAS実行と限定閲覧確認）［草案］
	構成（要素・関係）:
		valis/nodes/D/D3.md。parent_id: null。verifies: [A1, B1, B2, C1, C2]
	ロジック:
		GAS表示と許可外アクセス拒否をユーザーが確認。
	実態:
		未実施・結果未受領。証跡なし。

E1:（D1, C1, C2 / GAS配信スタブ証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E1.md。parent_id: null。evidence_for: [D1]。 検証対象: [C1, C2]
	ロジック:
		配信スタブ結果。対象ハッシュはNodeに保持。
	実態:
		既存成功結果を移管。スタブ範囲で有効。

E2:（D1, B1, B2, C2 / 交信状態スタブ証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E2.md。parent_id: null。evidence_for: [D1]。 検証対象: [B1, B2, C2]
	ロジック:
		状態スタブ結果。対象ハッシュはNodeに保持。
	実態:
		既存成功結果を移管。スタブ範囲で有効。

