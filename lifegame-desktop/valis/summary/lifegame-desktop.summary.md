# Project Summary Manifest

lifegame-desktop。現在のNode構造と適用範囲を示す。詳細は各Node、仕様と資料の入口は `design/specification/README.md`。

現在入口: `design/specification/README.md`。量機仕様/採用分岐は `design/specification/ryouki-v1.md` と `design/ryouki-branches-v2/README.md`。実装順序は `operations/plans/implementation-sequence-v1.md`。全61Nodeは草案で、正式状態/階層/層間参照を維持する。新規登録・状態遷移なし。

開発版は4.2.46、Windows配布済み版は4.2.32。現在の対象は `operations/evidence/i11d-lower-renewal-v1/README.md`。菌膜を有限の基部/可食部を持つ群落へ変更し、survival/4で実費再生・維持不足消滅・群落単位/保存互換を接続。前半の個体係数探索は製品へ一括採用しない。限定検査と固定陸水実測の結果は同証跡を参照。I11継続：下層の未達経路、P/Q自然循環、全系統R1〜R6・性能は未認定。新Windows/ZIPはI12、構成修正は実稼働後。

## A：仕様

```text
A1:（起点 / 生態系の成長と生存観測）［草案］
	構成（要素・関係）:
		valis/nodes/A/A1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		第1〜第4組の構造を採用し、状態/計数/表示/説明/保存を同じID/単位/確定時点に揃える。植物の生産者役割/個体単位、P/Qの形態/相と採用画像を既存観測・保存へ対応させる。 量機を独立した主生物として追加採用し、通常型/相変異型/同居/個体単位と現行観測を接続する。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	A1.1:（A1 / 個体・系統・段階進化）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			通常の相/枝/年齢とQ第四相の成熟羽化例外を、盤面/横詳細/構成集計で一貫させる。三植物のIII3→IV6、P形態×三相、Q四相を年齢/宿主段階と区別する。 通常型I〜IVの移動1/2/3/4とIII3→IV6、相変異の共通3マス・1〜3/4の外見を区別する。通常型の第三相3枝/第四相6枝は採用した2画像へ対応させる。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	A1.2:（A1 / 各マスの環境・餌資源）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.2.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜は1マス1群落。基部/有限可食部/蓄えE・Mを区別し、通常採食は基部を残す。光合成・無条件補充は行わない。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	A1.3:（A1 / 性別・繁殖・遺伝）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.3.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			性別/無性別/階級、年齢成熟/繁殖待機と相を別に表示する。 高い繁殖力を維持し、相変異4の繁殖目的と実際の出生資格/費用/待機を分ける。子はI/年齢0。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	A1.4:（A1 / 局所経験と系統戦略）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.4.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			観察者の情報/適応/抵抗解析と、生物が局所的に知る情報を分離する。 相変異は低密度が一定ターン続いてから解除する可逆状態。密度/継続Tの数値は比較案として分離し、4の繁殖準備への優先補正を既存の局所判断へ接続する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	A1.5:（A1 / 寄生と宿主の生活環）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			H→P→Qの付随とP→H/Q→Pの関係線、Qの発育/羽化失敗/成功/IV自立を区別する。既存P二系統の形態とQの翅なしIVを対応させ、感染経路/成熟羽化/群体単位を維持する。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。後続修正/検証要否・草案/階層/参照は維持。

	A1.6:（A1 / 光合成と共生の栄養）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.6.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			記録数/生物量B/可食量/基部/蓄え/生産/再生/感染量/情報量を別尺度で表示保存する。森冠/星冠/淡水系統を生産者とし、本体一個体・有限可食量・有償再生を分ける。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。後続修正/検証要否・草案/階層/参照は維持。

	A1.7:（A1 / 共通生物モデルと栄養関係）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.7.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			分解者の群落数と体量Bを分離し、栄養切れによる消滅と同ID再生/別ID成立を区別する。草棲虫・水游虫は個体のまま。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

A2:（起点 / 独立した Windows ローカル実行）［草案］
	構成（要素・関係）:
		valis/nodes/A/A2.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
	ロジック:
		上部一体サマリ/右常設3パネル/独立横詳細と、作成画面非表示・同画面操作での進行維持を統一する。
	実態:
		第1〜第4組と比較開始値をA/B反映済み。比較値は未実測。追加仕様の実装/データ接続は未完。後続修正/検証要否・草案/階層/参照は維持。

```

## B：機能

```text
B1:（A1 / 再現可能な初期集団）［草案］
	構成（要素・関係）:
		valis/nodes/B/B1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

B2:（A1 / 生態系進行と状態整合）［草案］
	構成（要素・関係）:
		valis/nodes/B/B2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

	B2.1:（A1 / 生命サイクル）［草案］
		構成（要素・関係）:
			valis/nodes/B/B2.1.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

	B2.2:（A1 / 移動と競争）［草案］
		構成（要素・関係）:
			valis/nodes/B/B2.2.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

B3:（A1, A2 / 操作と生存観測）［草案］
	構成（要素・関係）:
		valis/nodes/B/B3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

B4:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 生態系の同期進行）［草案］
	構成（要素・関係）:
		valis/nodes/B/B4.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		生態確定/観測/描画/保存の時点とIDを一致させ、UI操作/補間でターンや抽選を進めない。 相変異判定/移動/採食/出生/同セル容量の予約を同じ確定状態で調停する。低密度が一定ターン続き通常占有へ収まる場合に同IDで解除し、出生と形態切替を分離する。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B4.1:（A1.4, A1.2, A1.1 / 局所パラメータによる動作判断）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			宿主選好/実適合/遺伝適応/抵抗の条件付き値を観察者詳細へ渡し、生物自身の透視知識にはしない。淡水植物は全相で合法な局所移動を行い、位置変化だけで栄養/経験を生成しない。 進化枝と個体状態から行動を選び、相変異4は繁殖適地/栄養確保を優先する。全域命令や常時出生にしない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B4.2:（A1.5, A1.2, A1.4 / 寄生の遷移）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.2.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			寄生の各段階/Q発育/羽化準備/失敗/成功/IV自立とP死亡の確定記録を表示保存へ渡す。P形態/本人相/宿主段階とQ羽化状態を別に扱い、絵から感染経路/飛翔を追加しない。
		実態:
			植物/P/Qの造形対応をA/B反映済み。独立植物はI03、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。後続修正/検証要否・草案/階層/参照は維持。

	B4.3:（A1.6, A1.2 / 非採食の栄養収支）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.3.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜は実有機物を分解・同化し、Eを支払って可食部を再生する。維持不足の連続で基部も消滅する。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	B4.4:（A1.7, A1.2, A1.6 / 生産者・餌生物の共通生活処理）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.4.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			同ID再生と近傍CAによる新ID/親/世代付きの群落成立を別処理とする。個体寿命は適用せず、出生費と有限材料を維持する。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

B5:（A1.1, A1.2, A1.3, A2, A1.4 / 生態系の観測・比較操作）［草案］
	構成（要素・関係）:
		valis/nodes/B/B5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		上部一体サマリ・右常設3パネル・独立横詳細を維持し、選択/追跡/表示/グラフ対象で停止しない。採用形/相/年齢/生活状態を同じ確定IDから盤面/詳細/グラフ/保存へ渡す。 通常/相変異1〜3/4と同居個体を同じ確定IDから描画/選択/集計/保存へ渡す。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B5.1:（A1.1, A1.2 / 系統樹と進化条件の参照機能）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			系統樹の相/枝/年齢成熟と寄生生活状態/Q第四相例外、植物の機能3→6分岐/比較閾値/未提示値を区別する。三植物の3→6分岐、PのA/B/C×I〜III、QのI〜IVを採用区画と対応させる。 量機のIII-1→IV-1/2、III-2→IV-3/4、III-3→IV-5/6と相変異の区分を参照する。第三相/第四相の採用2画像を使い、第四相同士を進化順に接続しない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B5.2:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 進化・繁殖・生態関係の説明シート）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.2.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜の説明は群落単位とし、基部/可食部・蓄え・実分解/実費再生・成立後Tを表示。個体年齢/雌雄は適用しない。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	B5.3:（A1.1, A1.2, A1.3, A1.5, A1.6 / 確定した行動のモーション表示）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.3.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			既存遠景記号/近景絵柄/事前陰影を保ち、確定した採食/捕食/攻撃/防御/排除/感染/羽化を区別して描く。陸生二系統/浮遊淡水系統/P形態/翅なしQを採用図で描き、年齢・状態差を重ねる。 初回の平たい通常型と採用した通常分岐2画像・相変異2画像へ対応し、輪郭/殻/支持構造と黒い窪み/小さい脚/同居を描き分ける。実行用素材と縮小判読性は未完。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B5.4:（A1, A2, A1.2 / 最終結果図鑑と再生・新規保存）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.4.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			初期/実効条件・定義版・最終集計/状態要約・全ターン原値/100T要約を保存する。採用形と機械ID/状態/版を保存へ対応させ、旧光樹/海生/旧Q記録を黙って変換しない。 個体ごとの相/枝/相変異/年齢/密度カウンタ/同居参照と定義版を保存再生へ対応させる。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の係数はI04の比較値。旧9区画図は未採用。独立植物はI03接続/限定検査済み。量機はI04、一次寄生PはI05接続。QはI06、情報はI07、生成/保存はI08接続。観測UIはI09接続・限定検査済み。採用素材はI10接続、全体実測はI11以降。草案/構造/既存証跡の対象版を維持。

	B5.5:（A1, A1.1, A1.3, A1.5, A1.7 / 個体数・集団構成・生態関係のグラフ）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.5.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜を群落数、身体B、可食B、実分解/再生Eへ分けて全ターン観測する。年齢/雌雄の構成は非適用として集計する。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	B5.6:（A1.1, A1.2, A1.5, A1.7, A2 / 生物の選択・所在強調・個体追跡）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.6.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜の再生中も同じIDを追跡し、群落の消滅後は別IDへ追跡を移さない。新群落は別の成立として扱う。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

```

## C：実装

```text
C1:（B1 / 初期化・seed・種族定義）［草案］
	構成（要素・関係）:
		valis/nodes/C/C1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C2:（B2 / ターン接合とスナップショット）［草案］
	構成（要素・関係）:
		valis/nodes/C/C2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

	C2.1:（B2.1 / 資源・成長・繁殖）［草案］
		構成（要素・関係）:
			valis/nodes/C/C2.1.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

	C2.2:（B2.2 / 行動・同時戦闘・移動）［草案］
		構成（要素・関係）:
			valis/nodes/C/C2.2.md。登録済みの参照先。
		ロジック:
			現行仕様の成立根拠には使わず、再利用時に本体を確認する。
		実態:
			現行対象外。正式状態の変更は行っていない。

C3:（B1, B3 / 観測画面と制御）［草案］
	構成（要素・関係）:
		valis/nodes/C/C3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C4:（A2, B5 / Electron と Windows 配布）［草案］
	構成（要素・関係）:
		valis/nodes/C/C4.md。Electron起動とWindows配布。
	ロジック:
		ローカル配布物から起動する。実装と配布検査の詳細は本体へ委ねる。
	実態:
		4.2.32: 4.2.32のWindows ZIPと同梱証跡を生成する接続。出力Workerを含み、同梱READMEを現行の図鑑保存へ修正。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

C5:（B4 / モックの個体・資源・繁殖モデル）［草案］
	構成（要素・関係）:
		valis/nodes/C/C5.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C6:（B5 / モックの造形投影・観測画面・配布）［草案］
	構成（要素・関係）:
		valis/nodes/C/C6.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

C7:（B4 / 同期ターン接合と世界確定）［草案］
	構成（要素・関係）:
		valis/nodes/C/C7.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
	ロジック:
		survival/4へ菌膜群落の有限収支・基部保護・再生/消滅を同期更新へ接合。旧3/2/1/無指定の計算経路を維持する。
	実態:
		採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	C7.1:（B4, B4.4 / 初期値・固定世界・31種の共通状態）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.1.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			版付き菌膜群落設定/状態を追加。初期の総E/B/Mと明示0を保ち、個体寿命/年齢非適用を設定・生成・不変条件へ接続する。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	C7.2:（B4.3, B4.4 / 有限栄養・資源CA・生産と死骸）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.2.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			通常採食は共有する可食在庫のみ。分解・同化Eから上限付き再生費を払い、維持不足で消滅して有限死骸へ一度移す。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	C7.3:（B4.1 / 局所行動・同時移動戦闘・学習）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.3.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜以外の行動係数は追加採用しない。前半の草棲虫の視野/移動費/速度の比較は探索証跡に限定する。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	C7.4:（B4, B4.4 / 成長・遺伝・出生と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.4.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			群落のI/II成長と有償隣接成立を接続。基部Bは出生時Bに内包し、同ID回復と新ID/親/世代を混同しない。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	C7.5:（B4.2 / 寄生生活環と外部情報）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.5.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			P/Qは旧survival/3の局所探索等を新4にも継承するだけで係数/宿主/生活環を変更しない。菌膜以外の自然循環認定は行わない。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

C8:（B5, B5.1, B5.2, B5.5, B5.6 / 観測操作・図鑑と説明シート）［草案］
	構成（要素・関係）:
		valis/nodes/C/C8.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
	ロジック:
		既存画面の菌膜単位と専用詳細のみ接続。UI構成・採用画像・遠近の造形/背景は維持する。
	実態:
		採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	C8.1:（B5.3, B5.5, B5.6 / 盤面と個体の描画・確定モーション）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.1.md。契約: operations/plans/i11b-foodweb-routes-v1.md。証跡: operations/evidence/i11b-foodweb-routes-v1/README.md。
		ロジック:
			背景の厳密な全0マスク処理と未使用bitmap転送を省略し、旧overviewを解放。12背景比較のRGBA差0、採用画像/遠近表現を維持。
		実態:
			4.2.44 I11b限定調整。草案。I11継続: 下層の自然更新、P/Qの限定窓と次世代、未評価系統/R1〜R6、初回準備/保持メモリ。新WindowsはI12。

	C8.2:（B5.4 / 結果保存と初期条件からの再実行）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.2.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			全Tの菌膜群落原値・CSV単位・終端要約/実効設定を保存。新4/旧3以下の署名を分離し旧再生を守る。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

```

## D：検証計画

```text
D1:（A1, B1, C1, C2 / 初期値・入力境界・再現性）［草案］
	構成（要素・関係）:
		valis/nodes/D/D1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D2:（A1, B2, B2.1, B2.2, C2, C2.1, C2.2 / 生態ルールと不変条件）［草案］
	構成（要素・関係）:
		valis/nodes/D/D2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D3:（A1, A2, B3, C3 / 実画面の操作と表示）［草案］
	構成（要素・関係）:
		valis/nodes/D/D3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D4:（A2, C4 / 配布と実 Electron 起動）［草案］
	構成（要素・関係）:
		valis/nodes/D/D4.md。配布・展開照合・実Electron起動の計画。
	ロジック:
		C4と対象版を照合して配布物そのものを実行する。
	実態:
		4.2.32: Windows ZIPの全src/原画一致・全展開SHA・実exe/Worker/画像を別々に確認する。4.2.32のCI結果はE7へ接続。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

D5:（A1.1, A1.2, A1.3, B4, C5 / 個体・4入力・進化・繁殖の検証計画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D5.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D6:（A1.1, A1.2, A1.3, B5, C6 / モックの画面・描画・実行検証計画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D6.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

D7:（C7, C7.1, C7.2, C7.3 / 再現性・有限収支・同時競合）［草案］
	構成（要素・関係）:
		valis/nodes/D/D7.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
	ロジック:
		有限基部/再生費/出生費を境界検査。新旧4版×8生成profile×T0〜2の96状態でsource一致、旧4版160状態/32全期間snapshotの完全一致を照合する。
	実態:
		採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

D8:（C7 / 生態循環と結合進行）［草案］
	構成（要素・関係）:
		valis/nodes/D/D8.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
	ロジック:
		下層の死因・短期候補・棄却した組合せと菌膜群落の実分解/再生を分けて実測する。500Tを全系統生存認定へ一般化しない。
	実態:
		採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	D8.1:（C7.4 / 相・出生・遺伝と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.1.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			菌膜の有償隣接成立でID/親/世代と有限収支を検査。同ID再生を出生数へ加えず、年齢・雌雄は非適用とする。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

	D8.2:（C7.5 / 寄生・高次寄生と情報）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.2.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
		ロジック:
			旧版完全一致を用いてP/Qの計算維持を確認。今回の群落実測をP/Q自然生活環の合格へ転用しない。
		実態:
			採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

D9:（C8, C8.1, C8.2 / 観測画面・系統樹・説明と描画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D9.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
	ロジック:
		Linux Chromiumの短期実Worker・停止再開/選択・菌膜横詳細・全T保存/再生を照合。Windows/500T画面は対象外。
	実態:
		採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

```

## E：検証証跡

```text
E1:（D1, D2, D4 / エンジン・パッケージ補助検査）［草案］
	構成（要素・関係）:
		valis/nodes/E/E1.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E2:（D3 / Chromium 実画面検査）［草案］
	構成（要素・関係）:
		valis/nodes/E/E2.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E3:（D4 / Windows配布・実exe検証）［草案］
	構成（要素・関係）:
		valis/nodes/E/E3.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E4:（D5, D6 / 1マス1個体モックの実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E4.md。登録済みの参照先。
	ロジック:
		現行仕様の成立根拠には使わず、再利用時に本体を確認する。
	実態:
		現行対象外。正式状態の変更は行っていない。

E5:（D7, D8, D8.1, D8.2 / 現行生態計算の実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E5.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
	ロジック:
		菌膜の死因調査、前半候補の採否、群落の固定陸水実測、関連検査と旧版完全一致を版付きで記録する。
	実態:
		採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

E6:（D9 / 現行観測画面のLinux実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E6.md。正本: design/specification/fungal-colonies-v1.md。契約: operations/plans/i11d-fungal-colonies-v1.md。証跡: operations/evidence/i11d-lower-renewal-v1/README.md。
	ロジック:
		菌膜群落単位/横詳細・実Worker・全T保存/旧再生のLinux実画面証跡を記録。新Windows/全端末性能へ一般化しない。
	実態:
		採用仕様をA/Bへ反映し4.2.46へ接続。草案。限定実測/検査の範囲は現行証跡参照。全系統の生存・P/Q自然循環・R1〜R6・新Windowsは未認定。

E7:（D4, D7, D8, D8.1, D8.2, D9 / 現行Windows配布exeの実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E7.md。operations/evidence/optimization-v4.2.32/windows-native.json、Windows app4.2.32 / 2309185。
	ロジック:
		対象SHAと版が一致する配布物を展開し、実exe・Worker・画像読込・Node非公開の実測で判定する。
	実態:
		4.2.32: CI39340183030/job118359506331で全件・画面・ZIP展開SHA・実Windows exe/Worker/画像/Node非公開が成功。対象2309185/artifact12229435734。全PC性能保証ではない。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

```
