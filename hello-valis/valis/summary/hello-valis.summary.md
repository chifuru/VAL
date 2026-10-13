# Hello VALIS — Project Summary Manifest
project_id: hello-valis
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
core_definition_mutation: prohibited
canonical_path: valis/summary/hello-valis.summary.md
project_root: hello-valis/
current_status: 電子生態系の実装反映済み。実ブラウザ・GAS確認待ち。
Manifest 初期登録: 既存A1/B1/C1/D1/E1。今回の新規追加なし。
Manifest 反映: FLOW-05。世界観、相互作用、実装対応、検証範囲、E1有効性を反映。
閲覧: 指定メンバーのみ。GASアクセス設定と実行確認はユーザー担当。
作業手順: operations/plans/hello-valis.md
次FLOW候補: 実環境結果受領後にFLOW-08。

A1:（なし / 電子空間の知性）［草案］
	構成（要素・関係）:
		valis/nodes/A/A1.md。parent_id: null。
	ロジック:
		文字の可読性を維持する生態系。限定閲覧。
	実態:
		実装反映。GAS確認はユーザー担当。

B1:（A1 / 生態系と文字の相互作用）［草案］
	構成（要素・関係）:
		valis/nodes/B/B1.md。parent_id: null。
	ロジック:
		derived_from: [A1]。クリック、遅延応答、文字の5位相、停止・リセット。
	実態:
		状態シミュレーション成功。描画未確認。

C1:（B1 / GASとCanvas実装）［草案］
	構成（要素・関係）:
		valis/nodes/C/C1.md。parent_id: null。
	ロジック:
		implements: [B1]。src/Code.gs、src/Index.html。
	実態:
		粒子・信号上限、動作軽減、非表示時停止。GAS未確認。

D1:（A1, B1, C1 / 体験の検証計画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D1.md。parent_id: null。
	ロジック:
		verifies: [A1, B1, C1]。tests/hello-valis.test.cjs、state.test.cjs、experience.test.cjs。
	実態:
		スタブ2件成功。ブラウザテストは環境不足。

E1:（D1, C1 / ローカル証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E1.md。parent_id: null。
	ロジック:
		evidence_for: [D1]。対象ハッシュをNodeに保持。
	実態:
		スタブ範囲で有効。Chromiumなし。GAS確認待ち。

