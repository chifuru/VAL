# Project Summary Manifest

lifegame-desktop。現在のNode構造と適用範囲を示す。詳細は各Node、仕様と資料の入口は `design/specification/README.md`。

現在入口: `design/specification/README.md`。量機仕様: `design/specification/ryouki-v1.md`、採用分岐: `design/ryouki-branches-v2/README.md`。第三相3枝/第四相6枝の2画像は採用済みで、造形確認待ちは解消。比較係数と未採用の旧9区画図を区別する。実装順序は `operations/plans/implementation-sequence-v1.md`。I02の基底群落・有限再生・観察/保存を実装し、次はI03の独立植物3系統。独立植物等の追加実装/素材化/実測は未完、全Node草案、新規登録・状態遷移なし。

開発版は4.2.34、Windows配布済み版は4.2.32。今回のC/D/E・src/testsと限定検証の範囲は `operations/evidence/i02-producer-colonies-v1/README.md`。Windows配布の現状はE7、新ZIPは未作成。既存最適化の対象は `operations/evidence/optimization-v4.2.32/README.md`。対象版付き証跡は未実装の追加生態仕様の合格根拠ではない。

## A：仕様

```text
A1:（起点 / 生態系の成長と生存観測）［草案］
	構成（要素・関係）:
		valis/nodes/A/A1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		第1〜第4組の構造を採用し、状態/計数/表示/説明/保存を同じID/単位/確定時点に揃える。植物の生産者役割/個体単位、P/Qの形態/相と採用画像を既存観測・保存へ対応させる。 量機を独立した主生物として追加採用し、通常型/相変異型/同居/個体単位と現行観測を接続する。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	A1.1:（A1 / 個体・系統・段階進化）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			通常の相/枝/年齢とQ第四相の成熟羽化例外を、盤面/横詳細/構成集計で一貫させる。三植物のIII3→IV6、P形態×三相、Q四相を年齢/宿主段階と区別する。 通常型I〜IVの移動1/2/3/4とIII3→IV6、相変異の共通3マス・1〜3/4の外見を区別する。通常型の第三相3枝/第四相6枝は採用した2画像へ対応させる。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	A1.2:（A1 / 各マスの環境・餌資源）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.2.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			生体/群落/体外感染量/死骸/情報を描画・選択・計数で区別し、同居/基部残存/可食部0を識別する。大型植物と基底群落、同居容量、本体/可食部、浮遊する淡水個体の局所位置を区別する。 草と虫の有限在庫、相変異時の摂食増加、主生物側最大3体同居の量機限定例外を定義する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	A1.3:（A1 / 性別・繁殖・遺伝）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.3.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			性別/無性別/階級、年齢成熟/繁殖待機と相を別に表示する。 高い繁殖力を維持し、相変異4の繁殖目的と実際の出生資格/費用/待機を分ける。子はI/年齢0。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	A1.4:（A1 / 局所経験と系統戦略）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.4.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			観察者の情報/適応/抵抗解析と、生物が局所的に知る情報を分離する。 相変異は低密度が一定ターン続いてから解除する可逆状態。密度/継続Tの数値は比較案として分離し、4の繁殖準備への優先補正を既存の局所判断へ接続する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	A1.5:（A1 / 寄生と宿主の生活環）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			H→P→Qの付随とP→H/Q→Pの関係線、Qの発育/羽化失敗/成功/IV自立を区別する。既存P二系統の形態とQの翅なしIVを対応させ、感染経路/成熟羽化/群体単位を維持する。
		実態:
			植物/P/Qの造形対応をA/B反映済み。採用資料は決定稿、実装/素材化/実測は未完。後続修正/検証要否・草案/階層/参照は維持。

	A1.6:（A1 / 光合成と共生の栄養）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.6.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			記録数/生物量B/可食量/基部/蓄え/生産/再生/感染量/情報量を別尺度で表示保存する。森冠/星冠/淡水系統を生産者とし、本体一個体・有限可食量・有償再生を分ける。
		実態:
			植物/P/Qの造形対応をA/B反映済み。採用資料は決定稿、実装/素材化/実測は未完。後続修正/検証要否・草案/階層/参照は維持。

	A1.7:（A1 / 共通生物モデルと栄養関係）［草案］
		構成（要素・関係）:
			valis/nodes/A/A1.7.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			動物個体/植物群落/寄生群体を各IDで一度計数し、体外感染量/情報/死骸は生体数へ加えない。三植物は生産者として一回集計し、基底群落/動物/P/Qと有限収支へ接続する。 相変異型2〜3体同居でも各個体のID/栄養/生死/寄生参照/食物網配分を保ち、在庫を複製しない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

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
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B4.1:（A1.4, A1.2, A1.1 / 局所パラメータによる動作判断）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			宿主選好/実適合/遺伝適応/抵抗の条件付き値を観察者詳細へ渡し、生物自身の透視知識にはしない。淡水植物は全相で合法な局所移動を行い、位置変化だけで栄養/経験を生成しない。 進化枝と個体状態から行動を選び、相変異4は繁殖適地/栄養確保を優先する。全域命令や常時出生にしない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B4.2:（A1.5, A1.2, A1.4 / 寄生の遷移）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.2.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			寄生の各段階/Q発育/羽化準備/失敗/成功/IV自立とP死亡の確定記録を表示保存へ渡す。P形態/本人相/宿主段階とQ羽化状態を別に扱い、絵から感染経路/飛翔を追加しない。
		実態:
			植物/P/Qの造形対応をA/B反映済み。採用資料は決定稿、実装/素材化/実測は未完。後続修正/検証要否・草案/階層/参照は維持。

	B4.3:（A1.6, A1.2 / 非採食の栄養収支）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.3.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			図のB/可食量/生産・再生量と有限な入力/移転/費用を対応させる。三植物の生産/可食部再生/維持を有限入力と費用へ接続し、本体損傷/寿命を残す。
		実態:
			植物/P/Qの造形対応をA/B反映済み。採用資料は決定稿、実装/素材化/実測は未完。後続修正/検証要否・草案/階層/参照は維持。

	B4.4:（A1.7, A1.2, A1.6 / 生産者・餌生物の共通生活処理）［草案］
		構成（要素・関係）:
			valis/nodes/B/B4.4.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。
		ロジック:
			群落の基部/可食部/活性/蓄えと個体年齢/代表状態を表示へ渡す。基底群落の更新と大型植物一個体の成長/成熟繁殖を区別し、再生を出生にしない。
		実態:
			植物/P/Qの造形対応をA/B反映済み。採用資料は決定稿、実装/素材化/実測は未完。後続修正/検証要否・草案/階層/参照は維持。

B5:（A1.1, A1.2, A1.3, A2, A1.4 / 生態系の観測・比較操作）［草案］
	構成（要素・関係）:
		valis/nodes/B/B5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
	ロジック:
		上部一体サマリ・右常設3パネル・独立横詳細を維持し、選択/追跡/表示/グラフ対象で停止しない。採用形/相/年齢/生活状態を同じ確定IDから盤面/詳細/グラフ/保存へ渡す。 通常/相変異1〜3/4と同居個体を同じ確定IDから描画/選択/集計/保存へ渡す。
	実態:
		既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B5.1:（A1.1, A1.2 / 系統樹と進化条件の参照機能）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.1.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			系統樹の相/枝/年齢成熟と寄生生活状態/Q第四相例外、植物の機能3→6分岐/比較閾値/未提示値を区別する。三植物の3→6分岐、PのA/B/C×I〜III、QのI〜IVを採用区画と対応させる。 量機のIII-1→IV-1/2、III-2→IV-3/4、III-3→IV-5/6と相変異の区分を参照する。第三相/第四相の採用2画像を使い、第四相同士を進化順に接続しない。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B5.2:（A1.1, A1.2, A1.3, A1.4, A1.5, A1.6, A1.7 / 進化・繁殖・生態関係の説明シート）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.2.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			短い通常要約と必要な横詳細で、群落/個体/群体/感染量/情報/死骸、選好/遺伝適応/抵抗、鮮度/期限/Q痕跡を説明する。植物の本体/可食量と移動、P形態、Q最終IVの採用範囲と未実装を説明する。 背中だけ黒の1〜3、黒と深緑の4、移動全相3、同居2〜3と繁殖目的/繁殖力の違いを説明する。通常分岐は採用2画像と正本の名称/親子対応を使う。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B5.3:（A1.1, A1.2, A1.3, A1.5, A1.6 / 確定した行動のモーション表示）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.3.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			既存遠景記号/近景絵柄/事前陰影を保ち、確定した採食/捕食/攻撃/防御/排除/感染/羽化を区別して描く。陸生二系統/浮遊淡水系統/P形態/翅なしQを採用図で描き、年齢・状態差を重ねる。 初回の平たい通常型と採用した通常分岐2画像・相変異2画像へ対応し、輪郭/殻/支持構造と黒い窪み/小さい脚/同居を描き分ける。実行用素材と縮小判読性は未完。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B5.4:（A1, A2, A1.2 / 最終結果図鑑と再生・新規保存）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.4.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			初期/実効条件・定義版・最終集計/状態要約・全ターン原値/100T要約を保存する。採用形と機械ID/状態/版を保存へ対応させ、旧光樹/海生/旧Q記録を黙って変換しない。 個体ごとの相/枝/相変異/年齢/密度カウンタ/同居参照と定義版を保存再生へ対応させる。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B5.5:（A1, A1.1, A1.3, A1.5, A1.7 / 個体数・集団構成・生態関係のグラフ）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.5.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			全期間3パネルと現在一体サマリで記録数/B/量/期間/欠測を分離する。大型植物本体は生産者へ一回、P/Qは群体で計数し、可食量/実B/器官数を混同しない。 同セル3体は3個体、相変異は出生/死亡ではない。全期間集計/実B/役割配分の重複を防ぐ。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

	B5.6:（A1.1, A1.2, A1.5, A1.7, A2 / 生物の選択・所在強調・個体追跡）［草案］
		構成（要素・関係）:
			valis/nodes/B/B5.6.md。 造形対応: design/specification/appearance-correspondence-v1.md。状態対応正本: design/specification/observation-state-contract-v1.md。 比較開始値: design/specification/initial-comparison-v1.md。 量機: design/specification/ryouki-v1.md。 採用分岐: design/ryouki-branches-v2/README.md。
		ロジック:
			分類別折返し/複数固有色の所在強調/0数項目整理/名札切替と独立横詳細を維持する。大型植物を主生物同等に選択/追跡し、再生/宿主付随/離脱でも同じIDへ接続する。 同居する各個体の所在強調/選択/追跡を保ち、セル全体と単一個体の対象を区別する。
		実態:
			既存採用範囲と量機の分岐2画像をA/Bへ反映。量機の戦闘3倍率は採用済み、他の未選定値は比較案。旧9区画図は未採用。追加仕様の実装/素材化/実寸確認/実測は未完。草案/構造/既存証跡の対象版を維持。

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
		valis/nodes/C/C7.md。同期ターンと世界確定。
	ロジック:
		C7.1〜C7.5を接合し、前状態と有限予算から次状態を確定する。
	実態:
		4.2.34 I02: 群落版を明示した同期ターンと既存8優遇/直接計算/Workerを接続。旧経路180状態、新群落の動的/静的48状態と段階転送を照合。 I03の独立植物3系統を同じ確定点へ接続。 草案。

	C7.1:（B4, B4.4 / 初期値・固定世界・31種の共通状態）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.1.md。初期値・固定世界・31種の状態。
		ロジック:
			目的別の決定的乱数と、独立した占有枠・有限台帳を保持する。
		実態:
			4.2.34 I02: colony/1・colony-state/1・全地域比較値を保存。基部2Bと有限可食在庫、成立由来、初期適地占有率/種別直接数/初期0を区別。 I03の大型生産者枠と状態版を追加。 草案。

	C7.2:（B4.3, B4.4 / 有限栄養・資源CA・生産と死骸）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.2.md。有限栄養・資源CA・生産と死骸。
		ロジック:
			供給元・取得・散逸を同じ台帳で調停する。
		実態:
			4.2.34 I02: 有限光/E/土壌Mから可食部を再生。採食と同ID回復、完全消失/死骸還元を分離し、供給B直入れを停止。新群落の一斉老化死を除外。 新植物の同セル受光/材料調停と後続の生態バランスを確認。 草案。

	C7.3:（B4.1 / 局所行動・同時移動戦闘・学習）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.3.md。局所行動・同時移動/戦闘・学習。
		ロジック:
			合法候補・予約・同時損害・実成果を接合する。
		実態:
			4.2.31: 候補の線形選択、旧乱数条件の小中大世界一致。 範囲/未確認: operations/evidence/optimization-v4.2.31/README.md。草案。

	C7.4:（B4, B4.4 / 成長・遺伝・出生と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.4.md。成長・遺伝・出生と繁殖例外。
		ロジック:
			同時予約と有限投資を守り、子をI相から開始する。
		実態:
			4.2.34 I02: 群落の局所有償定着と地域占有率を調停。子は新ID/I相/経過0、葉再生は出生なし。初期0は開始後の合法定着を永久禁止しない。 I03の年齢成熟/植物実績進化、I04の量機同居を個別接続。 草案。

	C7.5:（B4.2 / 寄生生活環と外部情報）［草案］
		構成（要素・関係）:
			valis/nodes/C/C7.5.md。寄生生活環と外部情報。
		ロジック:
			宿主参照・適合・成熟・移行費用・鮮度/文脈を接合する。
		実態:
			4.2.34 I02: 群落可食部の有償感染量を実採食割合で移転。親P/Qを分割せず、備蓄/失効/新PのEを有限台帳へ接続。 I05/I06の多段感染・遺伝/抵抗・P/Q生物量と新生活環は未実装。 草案。

C8:（B5, B5.1, B5.2, B5.5, B5.6 / 観測操作・図鑑と説明シート）［草案］
	構成（要素・関係）:
		valis/nodes/C/C8.md。観測操作・系統樹・説明と図鑑接続。
	ロジック:
		確定世界を観察し、操作や拡大を生態計算から分ける。
	実態:
		4.2.34 I02: 陸水の占有率/容量/初期在庫/再生を新世界へ接続。横詳細と全ターン群落指標を追加し、内部株の年齢/雌雄を推定しない。Linux画面47項目成功。 I03追加状態の観察接続。全UI整理/造形仕上げはI09/I10。 草案。

	C8.1:（B5.3, B5.5, B5.6 / 盤面と個体の描画・確定モーション）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.1.md。projection/scenery/habitat/art/renderer、生物/地物10原画と背景11素材。契約: operations/plans/habitat-visual-v3.1.md。
		ロジック:
			既存原画と固定区画/接続データを再利用し、遠景は全位置記号、近景は可視候補の詳細画。陰影は背景/接地画像へ準備し、生物上に暗色マスクを重ねない。装飾は生態/障害物を追加しない。
		実態:
			4.2.32: 固定区画・接続データ・全景/高精細画像と遠景の静止表示を再利用。位置索引・型付き探索領域・外観準備を接続。背景失敗時は区画分割で復旧。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

	C8.2:（B5.4 / 結果保存と初期条件からの再実行）［草案］
		構成（要素・関係）:
			valis/nodes/C/C8.2.md。結果保存と初期条件からの再計算。
		ロジック:
			初期条件・最終結果・全期間原値を保持し、暗黙再生保存を拒否。明示保存は新規記録とする。
		実態:
			4.2.34 I02: 全群落初期条件・定義版・全期間原値/CSVを保存再生。欠測/未知定義を拒否。旧署名は群落指定のない旧経路だけ互換。 I03以降の新状態版を保存/Worker/再生へ同時接続。新Windows配布はI12。 草案。

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
		valis/nodes/D/D7.md。再現性・有限収支・同時競合の計画。
	ロジック:
		C7系列の状態と調停条件を検査する。
	実態:
		4.2.34 I02: 旧版10条件180状態、新群落8設定48状態の世界/指紋/CSV/収支、有限採食/再生/曝露/地域上限を検査。全57単体ファイル成功、最終変更の関連再検査も通過。 追加生態の境界を段階検査。最終500T/R1〜R6はI11。 草案。

D8:（C7 / 生態循環と結合進行）［草案］
	構成（要素・関係）:
		valis/nodes/D/D8.md。生態循環と結合進行の計画。
	ロジック:
		存続・出生・資源・特殊生態の結合を対象条件付きで調べる。
	実態:
		4.2.34 I02: 河川OFF/湖沼OFF/河川ON各120T、計363状態の収支/不変条件を確認。陸水で生産→採食→被食後再生が成立。 分解者終端0/一条件の草棲虫0等を残し、新生活環接続後に最終バランスを評価。 草案。
	D8.1:（C7.4 / 相・出生・遺伝と繁殖例外）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.1.md。相・出生・遺伝と繁殖例外の計画。
		ロジック:
			同時出生・有限投資・子の開始相を照合する。
		実態:
			既存の実装対応を維持。今回の適用・検証範囲は operations/evidence/optimization-v4.2.31/README.md。全条件の認定/正式承認は未完。草案。

	D8.2:（C7.5 / 寄生・高次寄生と情報）［草案］
		構成（要素・関係）:
			valis/nodes/D/D8.2.md。寄生・高次寄生と情報の計画。
		ロジック:
			宿主・生活環・徴収・情報作用の境界を照合する。
		実態:
			既存の実装対応を維持。今回の適用・検証範囲は operations/evidence/optimization-v4.2.31/README.md。全条件の認定/正式承認は未完。草案。
D9:（C8, C8.1, C8.2 / 観測画面・系統樹・説明と描画）［草案］
	構成（要素・関係）:
		valis/nodes/D/D9.md。画面・系統樹・説明・保存再生、projection.testとgraphics-rebuildの受入計画。
	ロジック:
		実状態と表示・選択・保存数を照合し、観測独立を調べる。
	実態:
		4.2.34 I02: 群落設定/横詳細23、初期条件/供給/Worker24の計47画面検査、例外0。旧モデル設定の表示も維持。 旧保存記録のGUI再生全経路、全密集外観/Windowsは別検証。 草案。

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
		valis/nodes/E/E5.md。 operations/evidence/i02-producer-colonies-v1/README.md / source-hashes.json。旧証跡は対象版へ限定。
	ロジック:
		各対象の実装・仕様・環境と一致する記録範囲に限定して参照する。
	実態:
		4.2.34 I02: 旧経路180/新生成48/循環363状態の限定照合。主終端105/85/98、水游虫82/109/83。全57単体ファイルと最終関連再検査を通過。 新500T生存率/R1〜R6・全条件創発/性能は未認定。分解者等の未達を後続評価へ残す。 草案。

E6:（D9 / 現行観測画面のLinux実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E6.md。 operations/evidence/i02-producer-colonies-v1/README.md / source-hashes.json。旧証跡は対象版へ限定。
	ロジック:
		対象ハッシュとLinux/Chromiumの記録範囲に限定する。
	実態:
		4.2.34 I02: 最終runtimeでLinux Chromiumの群落設定/詳細23＋初期供給/Worker24、計47検査成功・例外0。初回試験の誤仮定と修正ログを保持。 旧記録のGUI全再生・Windows・全密集外観/性能の確認は未実施。 草案。

E7:（D4, D7, D8, D8.1, D8.2, D9 / 現行Windows配布exeの実測証跡）［草案］
	構成（要素・関係）:
		valis/nodes/E/E7.md。operations/evidence/optimization-v4.2.32/windows-native.json、Windows app4.2.32 / 2309185。
	ロジック:
		対象SHAと版が一致する配布物を展開し、実exe・Worker・画像読込・Node非公開の実測で判定する。
	実態:
		4.2.32: CI39340183030/job118359506331で全件・画面・ZIP展開SHA・実Windows exe/Worker/画像/Node非公開が成功。対象2309185/artifact12229435734。全PC性能保証ではない。 範囲/未確認: operations/evidence/optimization-v4.2.32/README.md。草案。

```
