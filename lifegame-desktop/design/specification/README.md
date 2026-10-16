# 生態シミュレーション A・B仕様

現在の正本は[統合A/B仕様v1.3](ab-system-specification-v1.3.md)と[実装着手前の調整v1.4](ab-readiness-v1.4.md)。v1.4が明示した条件はv1.4を優先する。[一枚の統合説明画像](atlas-v1.3/ecology-system-master.png)は、基本システム→共通ルール→行動と成長→寄生/社会性→系統別資料→観測の順に読む。ゲーム画面ではなく仕様説明資料。

- [実装着手判断と調整の照合](ab-readiness-review-v1.4.md)
- [画像索引・各部の位置](atlas-v1.3/README.md)
- [30系統の数値付表](ab-catalogue-v1.md)
- [84候補の採否・範囲](ab-feature-scope-v1.md)
- [資料照合記録](atlas-v1.3/coverage.md)
- [今回のFLOW実行契約（11節）](ab-readiness-v1.4.md)

寄生は宿主H→P→Qの付随関係。餌との重なりを許可し、P/Qは地表の独立マスを占有しない。今回の更新は既存17 A/B Nodeのみ。全41 Node草案、未実装・ゲーム未検証。独立Windowsローカル実行方式は従前どおり。

v1/v1.1/v1.2本文と69枚の分冊説明は基底・履歴として残す。数値や条件が異なる場合は統合仕様とv1.4調整を優先する。実装範囲C/D/E/src/testsへ進むには別途許可が必要。
