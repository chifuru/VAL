# LifeGame Project Summary Manifest

project_id: lifegame-desktop
summary_manifest_type: Project Summary Manifest
canonical_path: valis/summary/lifegame-desktop.summary.md
core_definition_mutation: prohibited
current_status: 実装・ローカル/Windows CI検証済み、全ノード草案

A1:（起点 / 生態系の成長と生存観測）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A1.md; 層: A; 親: なし
		対応: 意味定義
	ロジック:
		同じ初期値と設定から同じ初期集団・資源・ターン結果を得る。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

A2:（起点 / 独立した Windows ローカル実行）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A2.md; 層: A; 親: なし
		対応: 意味定義
	ロジック:
		Windows 10/11 x64、ZIP 全展開後 LifeGame.exe 起動。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

B1:（A1 / 再現可能な初期集団）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B1.md; 層: B; 親: なし
		対応: 意味定義
	ロジック:
		seed は1〜64文字、盤面8〜48、初期個体数2〜盤面容量、上限1〜3000ターン、勢力数2〜9。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

B2:（A1 / 生態系進行と状態整合）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B2.md; 層: B; 親: なし
		対応: 意味定義
	ロジック:
		資源回復→生命維持・採食→戦闘→移動→繁殖→集計の順。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

	B2.1:（A1 / 生命サイクル）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B2.1.md; 層: B; 親: B2
			対応: 意味定義
		ロジック:
			資源は採食後5ターンで復活。
		実態:
			Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

	B2.2:（A1 / 移動と競争）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/B/B2.2.md; 層: B; 親: B2
			対応: 意味定義
		ロジック:
			9行動を維持し、距離はチェビシェフ、盤面端で折返しなし。
		実態:
			Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

B3:（A1, A2 / 操作と生存観測）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/B/B3.md; 層: B; 親: なし
		対応: 意味定義
	ロジック:
		準備/開始/一時停止/再開/1ターン/再生成。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

C1:（B1 / 初期化・seed・種族定義）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C1.md; 層: C; 親: なし
		対応: src/model/config.js
	ロジック:
		文字列seedをFNV-1aで32bit化し、状態を保持するMulberry32を使用。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

C2:（B2 / ターン接合とスナップショット）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C2.md; 層: C; 親: なし
		対応: src/model/engine.js
	ロジック:
		入力stateを変更せずクローンして進行。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

	C2.1:（B2.1 / 資源・成長・繁殖）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C2.1.md; 層: C; 親: C2
			対応: src/model/lifecycle.js
		ロジック:
			採食前に維持費を払う。
		実態:
			Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

	C2.2:（B2.2 / 行動・同時戦闘・移動）［草案］
		構成（要素・関係）:
			Node File: valis/nodes/C/C2.2.md; 層: C; 親: C2
			対応: src/model/behavior.js
		ロジック:
			ターン開始の生存者位置を固定して全攻撃を計算し、HP減算を同時適用。
		実態:
			Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

C3:（B1, B3 / 観測画面と制御）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C3.md; 層: C; 親: なし
		対応: src/Index.html, src/styles.css, src/app.js
	ロジック:
		Canvasで資源・種族別生体・年齢段階・選択個体を描く。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

C4:（A2, B3 / Electron と Windows 配布）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/C/C4.md; 層: C; 親: なし
		対応: src/desktop/main.cjs, tools/package-windows.cjs, package.json
	ロジック:
		sandbox/contextIsolation有効、nodeIntegration無効。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

D1:（A1, B1, C1, C2 / 初期値・入力境界・再現性）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D1.md; 層: D; 親: なし
		対応: tests/engine.test.cjs, tests/manifest.test.cjs
	ロジック:
		node --test。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

D2:（A1, B2, B2.1, B2.2, C2, C2.1, C2.2 / 生態ルールと不変条件）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D2.md; 層: D; 親: なし
		対応: tests/engine.test.cjs
	ロジック:
		node --test。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

D3:（A1, A2, B3, C3 / 実画面の操作と表示）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D3.md; 層: D; 親: なし
		対応: tests/browser-smoke.cjs
	ロジック:
		Playwright Chromium。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

D4:（A2, C4 / 配布と実 Electron 起動）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/D/D4.md; 層: D; 親: なし
		対応: tests/desktop-smoke.cjs, tests/package.test.cjs
	ロジック:
		Windows CIでnpm ci、単体検査、Windows x64 ZIP生成、展開後SHA256照合、展開したLifeGame.exeでsmoke。
	実態:
		Manifest初期登録後、実装対応とE1/E2を反映済み。全ノード草案。Windows実行はE3で確認。

E1:（D1, D2, D4 / エンジン・パッケージ補助検査）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E1.md; evidence_for: D1, D2, D4
	ロジック:
		実結果のみを記録しsource-hashes.jsonと対応する。
	実態:
		Manifest初期登録済み。ローカル検査成功。版: ba4dd2fc6b42c401181cba4cfb359e2084b249da8ffe82b77995eabe9d4052f9。この証跡のWindows実行は対象外（E3を参照）。

E2:（D3 / Chromium 実画面検査）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E2.md; evidence_for: D3
	ロジック:
		実結果のみを記録しsource-hashes.jsonと対応する。
	実態:
		Manifest初期登録済み。ローカル検査成功。版: ba4dd2fc6b42c401181cba4cfb359e2084b249da8ffe82b77995eabe9d4052f9。この証跡のWindows実行は対象外（E3を参照）。

E3:（D4, A2, C4 / Windows配布・実exe検証）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/E/E3.md; evidence_for: D4; 層: E; 親: なし
	ロジック:
		CIでZIPの展開照合と実exe起動を確認する。
	実態:
		Manifest初期登録済み。CI run38830235546成功、版4156261、17検査/画面19項目/実exe10ターン。次FLOW候補なし。
