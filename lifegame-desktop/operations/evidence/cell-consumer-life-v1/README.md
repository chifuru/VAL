# CR06：有限採食・主生物生活・自律Qの限定証跡

E5 → D7/D8/D8.1/D8.2 → C7/C7.1/C7.2/C7.4/C7.5/C8.2。起点 `7c406a3`、対象は `cell-reorganization/1` の内部消費者接続。契約は [作業計画](../../plans/cell-consumer-life-v1.md) と [C/D接合契約](../../../design/implementation/cell-reorganization-v1.md)。正式Node状態は草案のまま。製品4.2.77の完成・更新・配布を意味しない。

## 対象と結果

- E/Mの要求を独立して充足させ、片満量でも有用な栄養が必要なら有限採食する。主生物・低次動物・菌・自律Qは所在マスの実食料を共有し、隣接資源を直接取得しない。Qは保持しないMを次Tへ戻し、情報を食べない。
- 主生物の初期身体Mを一度だけ計上。実維持、不足時のHP損失、有償回復、既存の学習/相進化、年齢と寿命死亡を接続。実維持3T分を任意投資に使い込まない。
- 同マスの第三定住枠への成熟I相出生、両親の事前予約、失敗支出0、親一回、子I/年齢0、単為生殖・貯精・実交配、量機の子へ圧縮を継承しない点を確認。
- 自律Qの既存維持/局所探索/有償移動・産卵を保持し、移動先の共有採食へ接続。当T羽化体/新葉/新死骸は追加の即時食物にしない。
- **新境界14＋必要回帰104、計118項目成功、失敗0。** 新方式3Tの内部接合、生成元/生成物一致、Worker差分/JSON、旧方式4Tの固定結果/再生、新方式の通常ターン/新保存ガードを限定照合。

| 実行ファイル | 成功 | ログ |
| --- | ---: | --- |
| `tests/cell-consumer-life.test.cjs` | 14 | [consumer.tap.txt](consumer.tap.txt) |
| `tests/cell-resources.test.cjs` | 20 | [resources.tap.txt](resources.tap.txt) |
| `tests/cell-life-cycle.test.cjs` | 18 | [lower-life.tap.txt](lower-life.tap.txt) |
| `tests/cell-circulation.test.cjs` | 21 | [circulation.tap.txt](circulation.tap.txt) |
| `tests/cell-interactions.test.cjs` | 14 | [interactions.tap.txt](interactions.tap.txt) |
| `tests/cell-space.test.cjs` | 8 | [foundation.tap.txt](foundation.tap.txt) |
| `tests/hyper-parasite.test.cjs` | 23 | [hyper.tap.txt](hyper.tap.txt) |

実行形は `node --test-reporter=tap tests/<name>.test.cjs`。全テスト/全初期条件/長期の反復は実施していない。生成8プロファイルの整合は `node tools/build-observation-model.cjs --check` で確認し、8条件の長期存続検証とは区別する。

## 実装上の具体化と追加発見

維持費の丸め前要求と丸め後支払の差が、十分な蓄えのある主生物にも微小不足を付け、回復・出生予約を禁止していた。要求/支払を同じ小数6桁へ揃え、偽の不足を除いた。係数・生存優遇の追加ではない。

子の既存E/B/Mと基礎費用を保持し、形成のE1.2/M0.02×Bで不足する分だけ親へ追加する。標準の合計費用E40・子E32/B8ならE41.6、量機の合計M1・子M1/B6ならM1.12が必要。追加は既存E拠出比で配分し、両親の予約が成功するまで引き落とさない。子の自由Mと身体Mを分け、残余Mだけを次Tへ戻す。旧方式の固定M3還元を併用しない。

物理資源は原在庫q、非生物有機物は実BまたはE/Mによる有限身体換算を採食枠へ接続。IDなし資源も一つのundefined在庫へ混ぜない。資源・有機物はマス別索引を使い、個体ごとの全盤探索へ戻さない。新しい食性、系統、枝、感染率は追加していない。

## 有効条件と無効化条件

[source-hashes.json](source-hashes.json) の生成元/生成物・計画・検査ファイルと生態署名が対象。[final-check.json](final-check.json) は正式構造、A/B/Core、Manifest一意性、対象ログ/生成署名の照合結果。旧方式だけの再生別名を保持し、`cellModel` を持つ世界へ旧署名の互換を付けない。

対応ソース/生成物/生活費・食料・資格・出生/寄生の境界を変更した場合は、該当する証跡を再評価する。初期条件や対象版が違う世界の存続保証に転用しない。Nodeの承認状態変更は行っていない。

## 後続

生きた動物の直接捕食/Q被食、光合成系主生物の共有光、水系専用値/淡水生活、低次群落の移動対象種/再生枝専用補正、複数IDの観測/表示/設定/保存・通常ターン公開は残件。死亡Tの新死骸や隣接採食で未接続処理を代用しない。

通常ターン/新方式保存の公開ガードを維持。自然P/Q多世代循環、500T/R1〜R6、性能、画面、Windows/配布は今回の認定対象外。Core/A/B本文・比較開始値・61Nodeの正式状態/階層/層間参照・UI/画像・製品版は維持した。
