# ライフゲーム：A仕様・B機能の検討資料

![最新の全体マップと局所パラメータ](emergent-overview-mock.png)

[現在の仕様まとめ](design-summary.md) / [具体化仕様v2](concrete-rules-v2.md) / [戦略の考え方](local-strategy.md)

戦略は固定モードから選ばず、本人の8パラメータと局所条件から基本動作を直接決める。その結果を集団形成・護衛・追跡・分散・周回等に見える動きとして観測する。これらの戦略名は制御命令ではない。

[固定8環境](environment-expansion.md) / [餌と量の表現](environment-food.md) / [餌の近傍更新](food-cellular-rules.md) / [進化3→6](evolution-trees/README.md) / [雌雄と繁殖](sex-and-reproduction.md)

実装・C/D/E・動作検証は行っていない。画像・数値・観測は草案/表示例。旧資料と画像は以前の検討記録で、最新表示と判断はv2を優先する。
