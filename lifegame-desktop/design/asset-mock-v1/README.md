# LIFE LAB 素材設計モック v1

利用者が確認した画面案v4を基準とし、地形・生物・資源・モーションをマップから独立した8枚の資料にする。製品コード・生態ルール・承認状態は変更しない。

[8枚をまとめたPDF](asset-mock-book.pdf)

## シート索引

|番号|資料|対象|
|---|---|---|
|01|[地形・環境・地物](01-terrain.png)|地形・環境・地物、または確定イベントの表示|
|02|[主役生物 1–7](02-main-a.png)|深淵触手、神鳥、再帰知性、光帆、重力環、星晶、多眼知覚|
|03|[主役生物 8–14](03-main-b.png)|深殻、並列生命、記憶殻、多頭蛇、日輪、反記銘生命、異化通信生命|
|04|[主役生物 15–21](04-main-c.png)|浮遊傘、植物共生、星海鯨、群体節足、プラズマ生命、深淵頭足、早成甲殻|
|05|[植物・餌生物・資源](05-food-resources.png)|微藻、岩苔、草本、菌膜、水游虫、草棲虫|
|06|[寄生・高次寄生・情報](06-parasites-information.png)|潮環、葉環、抑環|
|07|[移動・戦闘・採食](07-motion-actions.png)|地形・環境・地物、または確定イベントの表示|
|08|[成長・出生・宿主の変化](08-motion-life.png)|地形・環境・地物、または確定イベントの表示|

## 30系統の正式名との対応

既存カタログsrc/ecology/catalogue.jsを正とする。主役シートは第三相の代表的な造形案であり、全ての進化分岐を描き切った資料ではない。早成甲殻は第三相で完結。餌生物6系統とP/Q3系統は、それぞれ別シートへ配置する。

|ID|正式名|区分|成長相数|シート|
|---|---|---|---:|---|
|abyss|深淵触手|main|4|[02-main-a](02-main-a.png)|
|myth|神鳥|main|4|[02-main-a](02-main-a.png)|
|recursive|再帰知性|main|4|[02-main-a](02-main-a.png)|
|sail|光帆|main|4|[02-main-a](02-main-a.png)|
|gravity|重力環|main|4|[02-main-a](02-main-a.png)|
|crystal|星晶|main|4|[02-main-a](02-main-a.png)|
|manyeyes|多眼知覚|main|4|[02-main-a](02-main-a.png)|
|abyssshell|深殻|main|4|[03-main-b](03-main-b.png)|
|parallel|並列生命|main|4|[03-main-b](03-main-b.png)|
|memory|記憶殻|main|4|[03-main-b](03-main-b.png)|
|serpent|多頭蛇|main|4|[03-main-b](03-main-b.png)|
|solar|日輪|main|4|[03-main-b](03-main-b.png)|
|antimeme|反記銘生命|main|4|[03-main-b](03-main-b.png)|
|valis|異化通信生命|main|4|[03-main-b](03-main-b.png)|
|jelly|浮遊傘|main|4|[04-main-c](04-main-c.png)|
|kelp|植物共生|main|4|[04-main-c](04-main-c.png)|
|whale|星海鯨|main|4|[04-main-c](04-main-c.png)|
|swarm|群体節足|main|4|[04-main-c](04-main-c.png)|
|plasma|プラズマ生命|main|4|[04-main-c](04-main-c.png)|
|cephalopod|深淵頭足|main|4|[04-main-c](04-main-c.png)|
|precocial|早成甲殻|main|3|[04-main-c](04-main-c.png)|
|algae|微藻|plant|2|[05-food-resources](05-food-resources.png)|
|moss|岩苔|plant|2|[05-food-resources](05-food-resources.png)|
|grass|草本|plant|2|[05-food-resources](05-food-resources.png)|
|fungus|菌膜|fungus|2|[05-food-resources](05-food-resources.png)|
|waterbug|水游虫|prey|2|[05-food-resources](05-food-resources.png)|
|grassbug|草棲虫|prey|2|[05-food-resources](05-food-resources.png)|
|tideparasite|潮環|P|3|[06-parasites-information](06-parasites-information.png)|
|leafparasite|葉環|P|3|[06-parasites-information](06-parasites-information.png)|
|hyperparasite|抑環|Q|3|[06-parasites-information](06-parasites-information.png)|

## 素材の設計ルール

- 近景の姿と遠景の小記号で系統を対応させる。色だけではなく輪郭・姿勢・表示位置も使う。記号案の最小画素での判読性は未検証。
- 植物共生という主役と、微藻・岩苔・草本という餌/生産者を混同しない。群体節足も1マス1主役の一個体。寄生Pは宿主、QはPに付随する。拡大した寄生群の図を独立した盤面個体には使わない。
- 環境8種類と、物理地形5種類は別の属性。熱域の見た目を理由に新しい溶岩障害ルールを追加しない。岩塊・倒木・茂み・崖の描写は、実装時に通行/遮蔽の状態へ合わせる。
- 餌の環境差・残量差は同じ種類の描画差分。シートの胞子・栄養卵・種実を新しい生物系統として数えない。
- 情報は浮遊/滞留するエネルギーの表現。延長された表現型の抽象モデルであり、DNA獲得や遺伝子水平伝播の演出にしない。
- 雌雄差は基本形を保った小差。寄生群にオス/メスを設定しない。

## モーションと生態処理の接続

B5.3と統合A/Bの確定イベント規則を参照する。

|対象|モックで伝えること|実装時に守る境界|
|---|---|---|
|移動|旧位置→通過→到達の変化|競合で不成立の移動や通過中の採食を描かない|
|攻撃|予備→接触→戻り|対象と実損害が確定した後の演出。描画で攻防を再計算しない|
|不成立|届かない/遮られること|被害や流血、命中演出を追加しない|
|採食/刈取り|供給元から口への移転と残量変化|実取得分のみ。最大2粒/一口。死骸の先取りや無限供給に見せない|
|防御/育児|姿勢/輪郭と受入先への移転|実際に成立した防御/受入を表示する|
|出生/成長|子Iの出現、同じ個体の相の変化|子を成人相で描かない。進化を無料全快にしない|
|寄生/情報|宿主内階層、鮮度/量の変化|自由歩行する寄生個体や遺伝子獲得に置き換えない|

連続コマは演出設計の資料であり、処理順序や補間時間の変更ではない。通常の20主役はI/II/III/IV、早成甲殻はI/II/III。IIIの3枝とIVの各2枝の全差分は未収録。

索引とファイルの照合結果は[coverage.json](coverage.json)。これは資料の対応チェックであり、生態計算・描画性能の検証証跡ではない。

## 今回の実施範囲と残範囲

8枚は素材モックであり、背景透過・投影/原点の統一・実寸スプライト化・全方向・全分岐・全系統の雌雄差分・群体節足の女王/働育型/繁殖雄の専用差分・アニメーション書出しはまだ行っていない。8ページPDFは元画像をそのまま資料へ配置したもので、ゲームの素材アトラスではない。文字や構図に誤りがある場合、正はcatalogue.jsonと既存仕様であり、画像を根拠にルールを変更しない。

実行契約：既存B5.3/C8.1の責務内でFLOW-04の修正資料を作成し、関連NodeとManifestの現在参照を更新する。新規Node分割・src/tests更新・承認状態変更・E層の製品合格証跡更新は行わない。索引の30系統との対応と実体パスを照合するが、それを画像の完全な正しさや描画性能の証拠にはしない。

## 見た目の提案とルールの区別

図中に付いた情景説明は造形の補助であり、数値能力・宿主条件・資源の生成則を定義する本文ではない。情報域の発光鉱脈や熱域の光は材質案。能力の追加、地形固定条件の変更、資源の無償発生には使わない。寄生の図では宿主一体に一種類のP寄生群、QはそのPへの付着として扱う。地形・餌・P/Qが同じ光に埋もれないかは、実寸の描画試作で追加確認する。
