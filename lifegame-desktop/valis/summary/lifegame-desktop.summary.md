# LifeGame Project Summary Manifest

project_id: lifegame-desktop
summary_manifest_type: Project Summary Manifest
canonical_path: valis/summary/lifegame-desktop.summary.md
core_definition_mutation: prohibited
current_status: 最新A仕様モックv0.3のローカル実測成功、Windows確認待ち。従前製品のE1/E2/E3は最新A仕様の検証根拠ではない。全ノード草案

A1:（起点 / 生態系の成長と生存観測）［草案］
	構成（要素・関係）:
		Node File: valis/nodes/A/A1.md; 層: A; 親: なし
		対応: 意味定義
	ロジック:
		同じ初期値と設定から同じ初期集団・資源・ターン結果を得る。
	実態:
		最新Aの方向をA1.1〜A1.3へ展開。今回のモック証跡はE4。従前製品のE1/E2は最新Aの検証根拠ではない。

	A1.1:（A1 / 個体・系統・段階進化）［草案］
		Node File: valis/nodes/A/A1.1.md; 親: A1; 対象: ecosystem-mock-v0.3
		要約: 1マス最大1個体。初期値から20系統・6軸DNA・見た目の個体差を決定。同系統は仲間。部位別XPは持たず、幼体→若体→成体→条件分岐した進化体の節目を計算。基本系統は固定。能力はDNA・成長段階・分岐から計算する。
		対応:
		次FLOW候補: モック実装→D5/D6検証→E4記録

	A1.2:（A1 / 各マスの環境・4入力）［草案］
		Node File: valis/nodes/A/A1.2.md; 親: A1; 対象: ecosystem-mock-v0.3
		要約: 固定四分割を廃し、一続きの新規背景上にマスごとの環境を表示する。生命Fizz・鉱物Buzz・情報FizzBuzz・数値入力を有限資源として扱う。数値は栄養とは分け、次の摂取の成長量を調整する。環境は滞在中に毎ターン作用する。
		対応:
		次FLOW候補: モック実装→D5/D6検証→E4記録

	A1.3:（A1 / 性別・繁殖・遺伝）［草案］
		Node File: valis/nodes/A/A1.3.md; 親: A1; 対象: ecosystem-mock-v0.3
		要約: オス・メスを区別する。同系統の成熟した異性2体、十分なエネルギー、待機期間終了、近接と空きマスを条件に出生。両親のDNAを継承し、子の成長は初期化。出生・死亡は個体と一致し、移動中も個体IDを保つ。
		対応:
		次FLOW候補: モック実装→D5/D6検証→E4記録

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

## 最新A仕様のモック v0.3 — 初期登録

ユーザー確認済みの責務分割。承認済み状態への遷移は行わない。B1〜B3・C1〜C4・D1〜D4・E1〜E3は従前製品の記録であり、今回の仕様適合を表さない。




B4:（A1.1, A1.2, A1.3 / モックの生態進行）［草案］
	Node File: valis/nodes/B/B4.md; 親: なし; 対象: ecosystem-mock-v0.3
	要約: 資源回復→環境更新→生命維持・採食・段階進化→移動→ペア繁殖→集計。固定seedで再現。同じマスに個体を重ねず、新生児は次ターンから行動する。B3/S23による別セルは設けない。
	対応:
	次FLOW候補: モック実装→D5/D6検証→E4記録

B5:（A1.1, A1.2, A1.3, A2 / モックの観測・比較操作）［草案］
	Node File: valis/nodes/B/B5.md; 親: なし; 対象: ecosystem-mock-v0.3
	要約: 生成、開始、一時停止、1ターン、120ターン、マス選択、環境表示切替、20系統の見本、個体詳細、親子情報、摂取・進化・出生・死亡履歴と比較投与を提供。仮設定を画面に表示する。
	対応:
	次FLOW候補: モック実装→D5/D6検証→E4記録

C5:（B4 / モックの個体・資源・繁殖モデル）［草案］
	Node File: valis/nodes/C/C5.md; 親: なし; 対象: ecosystem-mock-v0.3
	要約: モデルは描画から独立。seedによる個体差、段階進化、餌と環境、空間占有、両親DNAの交叉、性別と繁殖待機を管理。部位のXP・成長状態を計算しない。
	対応: design/ecosystem-mock/src/model.js
	次FLOW候補: モック実装→D5/D6検証→E4記録

C6:（B5 / モックの造形投影・観測画面・配布）［草案］
	Node File: valis/nodes/C/C6.md; 親: なし; 対象: ecosystem-mock-v0.3
	要約: 原版FizzBuzzの描画・素材を改変せず利用。描画用の固定段階テンプレートへモデルを投影し、画像は個体差・段階・分岐をキーに保持。盤面と詳細画面は同じ投影を使う。新規の共通背景と現在マス環境を描画。Windows ZIPを生成する。
	対応: design/ecosystem-mock/src/presentation.js, design/ecosystem-mock/src/app.js, design/ecosystem-mock/index.html, design/ecosystem-mock/style.css, design/ecosystem-mock/desktop.cjs, design/ecosystem-mock/package.cjs
	次FLOW候補: モック実装→D5/D6検証→E4記録

D5:（A1.1, A1.2, A1.3, B4, C5 / 個体・4入力・進化・繁殖の検証計画）［草案］
	Node File: valis/nodes/D/D5.md; 親: なし; 対象: ecosystem-mock-v0.3
	要約: 再現性、20系統網羅、個体差、部位XPなし、4入力の効果、資源回復、環境作用、分岐、系統固定、異性・成熟・エネルギー・待機・空間の繁殖条件、遺伝、出生後の行動、死亡と占有整合を実測する。
	対応: design/ecosystem-mock/tests/model.test.cjs
	次FLOW候補: モック実装→D5/D6検証→E4記録

D6:（A1.1, A1.2, A1.3, B5, C6 / モックの画面・描画・実行検証計画）［草案］
	Node File: valis/nodes/D/D6.md; 親: なし; 対象: ecosystem-mock-v0.3
	要約: 実素材の読込、個体描画、進行と停止、選択と4入力の比較投与、出生・進化履歴、狭幅、描画例外、画像キャッシュ再利用、Windows配布exeの起動と進行を確認する。性能値は実測環境付きで報告し、全端末の保証にはしない。
	対応: design/ecosystem-mock/check.cjs, design/ecosystem-mock/smoke.cjs
	次FLOW候補: モック実装→D5/D6検証→E4記録

E4:（D5, D6 / 1マス1個体モックの実測証跡）［草案］
	Node File: valis/nodes/E/E4.md; 親: なし; version: mock-v0.3.0/source-hashes.json
	要約: モデル24項目・画面22項目成功。原版モジュールハッシュ一致。120ターンで出生60/死亡5/生存95、4入力摂取。Windows実測待ち。
	証跡: design/ecosystem-mock/evidence/report.json、model.log、source-hashes.json
	次FLOW候補: Windows確認→結果照合→main統合。承認状態は草案維持。
