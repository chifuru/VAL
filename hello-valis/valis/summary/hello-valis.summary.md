# Hello VALIS — Project Summary Manifest
project_id: hello-valis
summary_manifest_type: Project Summary Manifest
based_on_definition: valis/core/VALIS Summary Manifest.md
core_definition_mutation: prohibited
canonical_path: valis/summary/hello-valis.summary.md
current_status: ローカル実装あり・GAS未配置・未デプロイ
Manifest 初期登録: A1, B1, C1, D1, E1
Manifest 反映: FLOW-05。専用プロジェクトルート、新規GAS、限定閲覧、コミット承認を反映。
project_root: hello-valis/（VALリポジトリ配下）
参照パス基準: プロジェクトルート
確認待ち: GASを作成するGoogleアカウントと閲覧許可メンバー。
GitHubコミット: ユーザー明示指示あり。
GAS: 新規プロジェクト。閲覧は依頼者と指定メンバーのみ。未デプロイ。
作業手順: operations/plans/hello-valis.md
次FLOW候補: 実環境の検証結果取得後にFLOW-08。承認済みへの遷移は未実施。

A1:（なし / 表示仕様）［草案］
	構成（要素・関係）:
		valis/nodes/A/A1.md。parent_id: null。
	ロジック:
		固定の Hello, VALIS をブラウザ表示。
	実態:
		限定閲覧の指定あり。許可メンバーと認証・アクセス制御方式は未確定。

B1:（A1 / 固定メッセージ表示）［草案］
	構成（要素・関係）:
		valis/nodes/B/B1.md。parent_id: null。
	ロジック:
		derived_from: [A1]。GETで表示。
	実態:
		草案具体化済み。

C1:（B1 / GAS応答実装）［草案］
	構成（要素・関係）:
		valis/nodes/C/C1.md。parent_id: null。
	ロジック:
		implements: [B1]。src/Code.gs。
	実態:
		ローカル実装あり。GAS未配置。

D1:（A1, B1, C1 / 表示確認計画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D1.md。parent_id: null。
	ロジック:
		verifies: [A1, B1, C1]。tests/hello-valis.test.cjs。
	実態:
		ローカル確認あり。GAS確認待ち。

E1:（D1, C1 / ローカル確認証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E1.md。parent_id: null。
	ロジック:
		evidence_for: [D1]。SHA-256対象をNode Fileに記録。
	実態:
		ローカル範囲で有効。実ブラウザ未確認。

