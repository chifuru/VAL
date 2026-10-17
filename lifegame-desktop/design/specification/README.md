# 生態シミュレーション A・B仕様

画像とA/Bの接続：[採用形・描画基準・旧案を区別したモック対応表](ab-visual-reference-v1.md)。

現在の作業基準：[UI・バランス完成へ向けた決定稿](ui-balance-baseline-v1.md)。既存設計・生物・背景を一旦固定し、実装差分を埋めてUIと生態バランスを優先する。

現在の正本は次の順に適用する。後の文書が明示した対象条件だけを上書きし、未記載の生態ルールは維持する。

1. [統合A/B仕様 v1.3](ab-system-specification-v1.3.md)
2. [着手前調整 v1.4](ab-readiness-v1.4.md)
3. [生態バランス調整 v1.5](ab-balance-v1.5.md)
4. [事前地形・表示・再生条件 v1.6](ab-map-visual-v1.6.md)
5. [盤面で見える年齢・独立四相植物 v1.7](ab-life-age-plant-v1.7.md)
6. [年齢による能力変化 v1.8](ab-age-abilities-v1.8.md)

v1.6はA/Bに適用済み。事前作成地形＋許可候補のランダム化、代表6地形から36種程度への拡張、地形/生態の初期値分離、遠近の対応、見分けられる雌雄差、地形の版を含む再生条件を定義する。製品2.4で代表6地形×3寸法の事前セルデータ、候補地物、地形/生態初期値分離、保存再生の識別を接続した。地形・UIの検査範囲はoperations/evidence/map-ui-v2.4。2.4の証跡へ年齢モデルや新造形・長期生存率の完成を含めない。全59Node草案。

v1.7は進化相と年齢を分離し、幼体・老齢を近景の体形/質感と遠景の識別印で表示する要件を適用する。独立四相植物（仮称:光樹）の追加方針を含むが、専用数値・分岐条件は未確定、製品の登録は30系統のまま。年齢部分は製品2.5で能力・繁殖・観測へ接続した。専用の新造形と独立植物は未実装。

v1.8は幼体・成体・老齢による攻防・最大HP・移動負担・維持・回復・繁殖待機・光利用の変化を適用する。早成幼体には専用係数を設ける。係数は初期調整値。製品2.5のlife/1へ接続し、境界・有限収支・短期再現性・実画面を検査した。長期存続率の調整は未実施。[対象と限界](../../operations/evidence/age-ui-v2.5/README.md)を参照。

- [30系統の数値付表](ab-catalogue-v1.md)
- [84候補の採否・範囲](ab-feature-scope-v1.md)
- [一枚の全体説明画像](atlas-v1.3/ecology-system-master.png)と[索引](atlas-v1.3/README.md)
- [採用済み造形：植物共生05・社会性01・早成08・海生02](../creature-design-review-v5/README.md)
- [造形言語8方向の参考](../creature-design-review-v4/README.md)
- [採用方向を確認した寄生生物と陸生植物](../creature-design-review-v3/README.md)
- [年齢・雌雄・採用された分岐と植物の元案6枚](../creature-design-review-v2/README.md)
- [素材資料](../asset-mock-v1/README.md)
- [代表分岐・雌雄](../branch-mock-v1/README.md)
- [場面・状態・特殊生態](../scene-mock-v1/README.md)
- [現在のノード構造](../../valis/summary/lifegame-desktop.summary.md)

画像は説明・造形資料であり、数値や条件は上記の本文を正とする。寄生はH→P→Qへ付随し、情報は延長された表現型の抽象モデル。独立Windowsローカル実行、有限収支、出生は第一相という条件は維持する。履歴はGitと版付き資料へ委ねる。
