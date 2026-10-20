# I11b 固定3条件・500Tの生物別比較

survival/1 と survival/2 の同一固定3条件を比較した実測です。独立評価・holdout・全系統評価ではなく、R1〜R6はいずれも認定しません。初期不在と、その後の消失を分けます。個体数と群落量は生物量ではありません。

製品署名: `ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97`

生態モデルhash: `10f80f38829cdd22364ace430e80b080dbf3b272a40ea59fc2c4ed4e05b40034`

全18入力成果物のSHA256、固定条件、全6件の同一モデル・署名、0〜500Tの各501行を照合しました。再現コマンドと入力SHAは paired-comparison.json に記録しています。

v1/v2は年齢初期分布・寄生処理を含むモード全体の比較です。下層2変更だけへの因果帰属は行いません。

表の「出生」は製品累計、括弧内は観測で確認したgeneration>0の新IDです。150〜250は101状態の連続生存と最少数です。世代は500Tに生存する世代ごとの個体数です。死因は製品の死亡ログだけを集計し、未記録は死亡がなかったことを意味しません（P除去・宿主喪失などを個体数から死因へ補完しません）。


## river-0

|生物|版|初期→500T|150〜250T|出生（新ID）|500T世代:数|死因:数|状態|
|---|---|---:|---|---:|---|---|---|
|深淵触手 (abyss)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深淵触手 (abyss)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深殻 (abyssshell)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深殻 (abyssshell)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|微藻 (algae)|v1|3 → 3|継続 / 最少3|0 (0)|0:3|未記録|present500|
|微藻 (algae)|v2|3 → 3|継続 / 最少3|0 (0)|0:3|未記録|present500|
|反記銘生命 (antimeme)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|反記銘生命 (antimeme)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深淵頭足 (cephalopod)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深淵頭足 (cephalopod)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|星晶 (crystal)|v1|20 → 27|継続 / 最少28|30 (30)|1:13 / 2:5 / 3:7 / 4:2|starvation:1 / age:22|present500|
|星晶 (crystal)|v2|20 → 18|継続 / 最少29|26 (26)|1:10 / 2:4 / 3:4|combat:1 / starvation:2 / age:25|present500|
|森冠 (forestcrown)|v1|10 → 7|継続 / 最少20|17 (17)|1:3 / 2:4|age:20|present500|
|森冠 (forestcrown)|v2|10 → 20|継続 / 最少14|24 (24)|1:5 / 2:11 / 3:3 / 4:1|age:14|present500|
|淡水光合成体 (freshwaterlight)|v1|3 → 0|途切れ / 最少0|0 (0)|—|age:3|initially-present-lost|
|淡水光合成体 (freshwaterlight)|v2|3 → 0|途切れ / 最少0|0 (0)|—|age:3|initially-present-lost|
|菌膜 (fungus)|v1|33 → 0|途切れ / 最少0|5 (5)|—|harvest:34 / age:3 / starvation:1|initially-present-lost|
|菌膜 (fungus)|v2|33 → 0|途切れ / 最少0|8 (8)|—|harvest:36 / starvation:3 / age:2|initially-present-lost|
|草本 (grass)|v1|189 → 189|継続 / 最少189|0 (0)|0:189|未記録|present500|
|草本 (grass)|v2|189 → 189|継続 / 最少189|0 (0)|0:189|未記録|present500|
|草棲虫 (grassbug)|v1|33 → 0|途切れ / 最少0|12 (12)|—|combat:40 / age:2 / harvest:3|initially-present-lost|
|草棲虫 (grassbug)|v2|33 → 0|途切れ / 最少0|5 (5)|—|combat:36 / harvest:2|initially-present-lost|
|重力環 (gravity)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|重力環 (gravity)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|抑環 (hyperparasite)|v1|1 → 0|途切れ / 最少0|0 (0)|—|age:1|initially-present-lost|
|抑環 (hyperparasite)|v2|3 → 0|途切れ / 最少0|0 (0)|—|maintenance:1 / predation:1|initially-present-lost|
|浮遊傘 (jelly)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|浮遊傘 (jelly)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|植物共生 (kelp)|v1|24 → 1|継続 / 最少25|3 (3)|1:1|age:26|present500|
|植物共生 (kelp)|v2|24 → 1|継続 / 最少12|3 (3)|1:1|age:26|present500|
|葉環 (leafparasite)|v1|33 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-present-lost|
|葉環 (leafparasite)|v2|41 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-present-lost|
|多眼知覚 (manyeyes)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多眼知覚 (manyeyes)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|記憶殻 (memory)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|記憶殻 (memory)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|岩苔 (moss)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|岩苔 (moss)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|神鳥 (myth)|v1|24 → 0|継続 / 最少4|2 (2)|—|starvation:19 / combat:1 / age:6|initially-present-lost|
|神鳥 (myth)|v2|24 → 0|継続 / 最少4|6 (6)|—|starvation:10 / combat:3 / age:17|initially-present-lost|
|並列生命 (parallel)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|並列生命 (parallel)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|浮遊微藻 (phytoplankton)|v1|20 → 20|継続 / 最少20|0 (0)|0:20|未記録|present500|
|浮遊微藻 (phytoplankton)|v2|20 → 20|継続 / 最少20|0 (0)|0:20|未記録|present500|
|プラズマ生命 (plasma)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|プラズマ生命 (plasma)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|早成甲殻 (precocial)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|早成甲殻 (precocial)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|再帰知性 (recursive)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|再帰知性 (recursive)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|量機 (ryouki)|v1|24 → 2|継続 / 最少25|27 (27)|2:2|combat:13 / starvation:10 / age:26|present500|
|量機 (ryouki)|v2|24 → 1|継続 / 最少16|28 (28)|3:1|combat:14 / starvation:6 / age:31|present500|
|光帆 (sail)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|光帆 (sail)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多頭蛇 (serpent)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多頭蛇 (serpent)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|日輪 (solar)|v1|20 → 33|継続 / 最少32|51 (51)|1:7 / 2:7 / 3:10 / 4:7 / 5:2|starvation:13 / age:25|present500|
|日輪 (solar)|v2|20 → 6|継続 / 最少18|20 (20)|1:1 / 2:2 / 3:2 / 4:1|starvation:13 / age:21|present500|
|星冠 (starcrown)|v1|9 → 109|継続 / 最少20|120 (120)|1:20 / 2:37 / 3:26 / 4:18 / 5:8|age:20|present500|
|星冠 (starcrown)|v2|9 → 294|継続 / 最少21|311 (311)|1:11 / 2:33 / 3:50 / 4:46 / 5:41 / 6:33 / 7:29 / 8:16 / 9:14 / 10:12 / 11:9|age:26|present500|
|群体節足 (swarm)|v1|24 → 0|継続 / 最少7|4 (4)|—|starvation:8 / combat:1 / age:19|initially-present-lost|
|群体節足 (swarm)|v2|24 → 0|継続 / 最少6|9 (9)|—|age:23 / starvation:9 / combat:1|initially-present-lost|
|潮環 (tideparasite)|v1|1 → 0|途切れ / 最少0|3 (3)|—|未記録|initially-present-lost|
|潮環 (tideparasite)|v2|1 → 0|途切れ / 最少0|2 (2)|—|未記録|initially-present-lost|
|異化通信生命 (valis)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|異化通信生命 (valis)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|水游虫 (waterbug)|v1|33 → 16|継続 / 最少4|217 (217)|4:1 / 5:2 / 6:4 / 7:2 / 8:1 / 9:3 / 10:3|harvest:197 / combat:37|present500|
|水游虫 (waterbug)|v2|33 → 17|継続 / 最少4|175 (175)|0:1 / 1:1 / 2:3 / 3:1 / 4:1 / 7:1 / 8:2 / 12:1 / 13:3 / 14:2 / 15:1|harvest:172 / combat:19|present500|
|星海鯨 (whale)|v1|24 → 10|継続 / 最少25|9 (9)|0:7 / 1:3|starvation:17 / combat:3 / age:3|present500|
|星海鯨 (whale)|v2|24 → 34|継続 / 最少27|35 (35)|0:3 / 1:13 / 2:12 / 3:6|starvation:10 / combat:2 / age:13|present500|

### v1 寄生の実測

実初期 P/Q: 34 / 1。500Tに残る初期ID P/Q: 0 / 0。新実個体ID P/Q: 3 / 0。

|P生物・経路|曝露|侵入試行|侵入|新定着|同一ID移行|除去|放出E|
|---|---:|---:|---:|---:|---:|---:|---:|
|leafparasite / contact|0|0|0|0|0|5|0|
|leafparasite / feeding|313|0|0|0|0|0|15.36|
|leafparasite / carcass|0|0|0|0|0|0|0|
|leafparasite / water|0|0|0|0|0|0|0|
|tideparasite / contact|0|0|0|0|0|0|0|
|tideparasite / feeding|28|4|3|3|0|3|0.9|
|tideparasite / carcass|0|0|0|0|0|0|0|
|tideparasite / water|0|0|0|0|0|0|0|

Q窓: 0 P個体 / 0 個体T（うちQ寄生中 0）。接触や成功の数ではありません。

Q侵入試行 0 / 侵入 0 / 定着 0 / 羽化試行 0 / 羽化失敗 0 / 羽化 0 / 卵配置 0 / 次世代定着 0 / 発育E 0。

T0/150/250/500のP段階・Q状態、同一IDの遷移、卵材料の出現、親子IDはJSONへ原値を対応付けて記録しています。初期Q=0は維持失敗と判定しません。流量合計だけで生活環完了とは認定しません。


### v2 寄生の実測

実初期 P/Q: 42 / 3。500Tに残る初期ID P/Q: 0 / 0。新実個体ID P/Q: 2 / 0。

|P生物・経路|曝露|侵入試行|侵入|新定着|同一ID移行|除去|放出E|
|---|---:|---:|---:|---:|---:|---:|---:|
|leafparasite / contact|1|1|0|0|0|13|0.18|
|leafparasite / feeding|337|1|0|0|0|0|15.36|
|leafparasite / carcass|0|0|0|0|0|0|0|
|leafparasite / water|0|0|0|0|0|0|0|
|tideparasite / contact|0|0|0|0|0|0|0|
|tideparasite / feeding|23|3|3|2|0|2|0.9|
|tideparasite / carcass|0|0|0|0|0|0|0|
|tideparasite / water|0|0|0|0|0|0|0|

Q窓: 3 P個体 / 5 個体T（うちQ寄生中 2）。接触や成功の数ではありません。

Q侵入試行 0 / 侵入 0 / 定着 0 / 羽化試行 0 / 羽化失敗 0 / 羽化 0 / 卵配置 0 / 次世代定着 0 / 発育E 0.01。

T0/150/250/500のP段階・Q状態、同一IDの遷移、卵材料の出現、親子IDはJSONへ原値を対応付けて記録しています。初期Q=0は維持失敗と判定しません。流量合計だけで生活環完了とは認定しません。

## lake-1

|生物|版|初期→500T|150〜250T|出生（新ID）|500T世代:数|死因:数|状態|
|---|---|---:|---|---:|---|---|---|
|深淵触手 (abyss)|v1|32 → 0|継続 / 最少3|7 (7)|—|starvation:36 / age:3|initially-present-lost|
|深淵触手 (abyss)|v2|32 → 0|継続 / 最少3|6 (6)|—|age:20 / starvation:18|initially-present-lost|
|深殻 (abyssshell)|v1|32 → 0|継続 / 最少26|4 (4)|—|combat:3 / starvation:11 / age:22|initially-present-lost|
|深殻 (abyssshell)|v2|32 → 23|継続 / 最少34|26 (26)|1:7 / 2:9 / 3:6 / 4:1|starvation:7 / age:28|present500|
|微藻 (algae)|v1|8 → 8|継続 / 最少8|0 (0)|0:8|未記録|present500|
|微藻 (algae)|v2|8 → 8|継続 / 最少8|0 (0)|0:8|未記録|present500|
|反記銘生命 (antimeme)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|反記銘生命 (antimeme)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深淵頭足 (cephalopod)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深淵頭足 (cephalopod)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|星晶 (crystal)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|星晶 (crystal)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|森冠 (forestcrown)|v1|7 → 14|継続 / 最少12|19 (19)|1:1 / 2:7 / 3:6|age:12|present500|
|森冠 (forestcrown)|v2|7 → 12|継続 / 最少14|19 (19)|1:1 / 2:2 / 3:6 / 4:3|age:14|present500|
|淡水光合成体 (freshwaterlight)|v1|5 → 0|途切れ / 最少0|0 (0)|—|age:5|initially-present-lost|
|淡水光合成体 (freshwaterlight)|v2|5 → 0|途切れ / 最少0|0 (0)|—|age:5|initially-present-lost|
|菌膜 (fungus)|v1|33 → 0|途切れ / 最少0|11 (11)|—|harvest:36 / age:6 / starvation:2|initially-present-lost|
|菌膜 (fungus)|v2|33 → 0|途切れ / 最少0|10 (10)|—|harvest:37 / age:5 / starvation:1|initially-present-lost|
|草本 (grass)|v1|178 → 178|継続 / 最少178|0 (0)|0:178|未記録|present500|
|草本 (grass)|v2|178 → 178|継続 / 最少178|0 (0)|0:178|未記録|present500|
|草棲虫 (grassbug)|v1|33 → 0|途切れ / 最少0|47 (47)|—|age:53 / starvation:1 / combat:26|initially-present-lost|
|草棲虫 (grassbug)|v2|33 → 0|途切れ / 最少0|59 (59)|—|combat:52 / starvation:6 / age:34|initially-present-lost|
|重力環 (gravity)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|重力環 (gravity)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|抑環 (hyperparasite)|v1|1 → 0|途切れ / 最少0|0 (0)|—|maintenance:1|initially-present-lost|
|抑環 (hyperparasite)|v2|2 → 0|途切れ / 最少0|0 (0)|—|predation:2|initially-present-lost|
|浮遊傘 (jelly)|v1|32 → 79|継続 / 最少66|138 (138)|1:2 / 2:28 / 3:36 / 4:9 / 5:4|starvation:9 / age:81 / combat:1|present500|
|浮遊傘 (jelly)|v2|32 → 63|継続 / 最少43|116 (116)|2:7 / 3:15 / 4:13 / 5:9 / 6:5 / 7:6 / 8:6 / 9:2|starvation:16 / age:69|present500|
|植物共生 (kelp)|v1|32 → 3|継続 / 最少39|10 (10)|1:3|age:39|present500|
|植物共生 (kelp)|v2|32 → 0|継続 / 最少24|10 (10)|—|age:42|initially-present-lost|
|葉環 (leafparasite)|v1|31 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-present-lost|
|葉環 (leafparasite)|v2|39 → 0|途切れ / 最少0|1 (1)|—|未記録|initially-present-lost|
|多眼知覚 (manyeyes)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多眼知覚 (manyeyes)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|記憶殻 (memory)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|記憶殻 (memory)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|岩苔 (moss)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|岩苔 (moss)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|神鳥 (myth)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|神鳥 (myth)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|並列生命 (parallel)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|並列生命 (parallel)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|浮遊微藻 (phytoplankton)|v1|24 → 24|継続 / 最少24|0 (0)|0:24|未記録|present500|
|浮遊微藻 (phytoplankton)|v2|24 → 24|継続 / 最少24|0 (0)|0:24|未記録|present500|
|プラズマ生命 (plasma)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|プラズマ生命 (plasma)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|早成甲殻 (precocial)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|早成甲殻 (precocial)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|再帰知性 (recursive)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|再帰知性 (recursive)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|量機 (ryouki)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|量機 (ryouki)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|光帆 (sail)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|光帆 (sail)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多頭蛇 (serpent)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多頭蛇 (serpent)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|日輪 (solar)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|日輪 (solar)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|星冠 (starcrown)|v1|10 → 92|継続 / 最少48|141 (141)|1:8 / 2:23 / 3:18 / 4:22 / 5:13 / 6:7 / 7:1|age:59|present500|
|星冠 (starcrown)|v2|10 → 94|継続 / 最少55|150 (150)|1:7 / 2:19 / 3:10 / 4:12 / 5:15 / 6:12 / 7:10 / 8:7 / 9:2|age:66|present500|
|群体節足 (swarm)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|群体節足 (swarm)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|潮環 (tideparasite)|v1|2 → 0|途切れ / 最少0|1 (1)|—|未記録|initially-present-lost|
|潮環 (tideparasite)|v2|2 → 0|途切れ / 最少0|1 (1)|—|未記録|initially-present-lost|
|異化通信生命 (valis)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|異化通信生命 (valis)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|水游虫 (waterbug)|v1|34 → 75|継続 / 最少70|261 (261)|1:2 / 2:8 / 3:2 / 4:7 / 5:8 / 6:14 / 7:16 / 8:7 / 9:2 / 10:4 / 11:3 / 12:2|combat:212 / starvation:6 / age:2|present500|
|水游虫 (waterbug)|v2|34 → 68|継続 / 最少76|240 (240)|1:2 / 2:8 / 3:10 / 4:12 / 5:9 / 6:6 / 7:11 / 8:5 / 9:5|combat:192 / starvation:11 / age:3|present500|
|星海鯨 (whale)|v1|32 → 42|継続 / 最少43|45 (45)|0:10 / 1:22 / 2:10|starvation:30 / age:5|present500|
|星海鯨 (whale)|v2|32 → 44|継続 / 最少52|66 (66)|0:2 / 1:20 / 2:16 / 3:2 / 4:4|starvation:29 / age:25|present500|

### v1 寄生の実測

実初期 P/Q: 33 / 1。500Tに残る初期ID P/Q: 0 / 0。新実個体ID P/Q: 1 / 0。

|P生物・経路|曝露|侵入試行|侵入|新定着|同一ID移行|除去|放出E|
|---|---:|---:|---:|---:|---:|---:|---:|
|leafparasite / contact|0|0|0|0|0|8|0|
|leafparasite / feeding|230|0|0|0|0|0|12.54|
|leafparasite / carcass|0|0|0|0|0|0|0|
|leafparasite / water|0|0|0|0|0|0|0|
|tideparasite / contact|0|0|0|0|0|1|0|
|tideparasite / feeding|11|2|1|1|0|0|0.42|
|tideparasite / carcass|0|0|0|0|0|0|0|
|tideparasite / water|0|0|0|0|0|0|0|

Q窓: 0 P個体 / 0 個体T（うちQ寄生中 0）。接触や成功の数ではありません。

Q侵入試行 0 / 侵入 0 / 定着 0 / 羽化試行 0 / 羽化失敗 0 / 羽化 0 / 卵配置 0 / 次世代定着 0 / 発育E 0。

T0/150/250/500のP段階・Q状態、同一IDの遷移、卵材料の出現、親子IDはJSONへ原値を対応付けて記録しています。初期Q=0は維持失敗と判定しません。流量合計だけで生活環完了とは認定しません。


### v2 寄生の実測

実初期 P/Q: 41 / 2。500Tに残る初期ID P/Q: 0 / 0。新実個体ID P/Q: 2 / 0。

|P生物・経路|曝露|侵入試行|侵入|新定着|同一ID移行|除去|放出E|
|---|---:|---:|---:|---:|---:|---:|---:|
|leafparasite / contact|1|1|1|1|0|15|0.06|
|leafparasite / feeding|292|0|0|0|0|0|13.74|
|leafparasite / carcass|0|4|1|0|0|0|0|
|leafparasite / water|0|0|0|0|0|0|0|
|tideparasite / contact|0|0|0|0|0|1|0|
|tideparasite / feeding|13|2|1|1|0|0|0.42|
|tideparasite / carcass|0|0|0|0|0|0|0|
|tideparasite / water|0|0|0|0|0|0|0|

Q窓: 1 P個体 / 2 個体T（うちQ寄生中 0）。接触や成功の数ではありません。

Q侵入試行 0 / 侵入 0 / 定着 0 / 羽化試行 0 / 羽化失敗 0 / 羽化 0 / 卵配置 0 / 次世代定着 0 / 発育E 0。

T0/150/250/500のP段階・Q状態、同一IDの遷移、卵材料の出現、親子IDはJSONへ原値を対応付けて記録しています。初期Q=0は維持失敗と判定しません。流量合計だけで生活環完了とは認定しません。

## woodland-2

|生物|版|初期→500T|150〜250T|出生（新ID）|500T世代:数|死因:数|状態|
|---|---|---:|---|---:|---|---|---|
|深淵触手 (abyss)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深淵触手 (abyss)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深殻 (abyssshell)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|深殻 (abyssshell)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|微藻 (algae)|v1|5 → 5|継続 / 最少5|0 (0)|0:5|未記録|present500|
|微藻 (algae)|v2|5 → 5|継続 / 最少5|0 (0)|0:5|未記録|present500|
|反記銘生命 (antimeme)|v1|24 → 3|継続 / 最少32|15 (15)|1:2 / 2:1|starvation:9 / age:27|present500|
|反記銘生命 (antimeme)|v2|24 → 4|継続 / 最少28|16 (16)|1:3 / 2:1|combat:3 / starvation:8 / age:25|present500|
|深淵頭足 (cephalopod)|v1|24 → 0|継続 / 最少2|1 (1)|—|combat:4 / starvation:20 / age:1|initially-present-lost|
|深淵頭足 (cephalopod)|v2|24 → 0|継続 / 最少4|4 (4)|—|starvation:15 / combat:4 / age:9|initially-present-lost|
|星晶 (crystal)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|星晶 (crystal)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|森冠 (forestcrown)|v1|8 → 12|継続 / 最少17|21 (21)|1:3 / 2:5 / 3:3 / 4:1|age:17|present500|
|森冠 (forestcrown)|v2|8 → 53|継続 / 最少12|57 (57)|1:3 / 2:12 / 3:18 / 4:8 / 5:8 / 6:3 / 7:1|age:12|present500|
|淡水光合成体 (freshwaterlight)|v1|2 → 0|途切れ / 最少0|0 (0)|—|age:2|initially-present-lost|
|淡水光合成体 (freshwaterlight)|v2|2 → 3|継続 / 最少2|5 (5)|2:3|age:4|present500|
|菌膜 (fungus)|v1|33 → 0|途切れ / 最少0|1 (1)|—|harvest:33 / age:1|initially-present-lost|
|菌膜 (fungus)|v2|33 → 0|途切れ / 最少0|1 (1)|—|harvest:34|initially-present-lost|
|草本 (grass)|v1|205 → 205|継続 / 最少205|0 (0)|0:205|未記録|present500|
|草本 (grass)|v2|205 → 205|継続 / 最少205|0 (0)|0:205|未記録|present500|
|草棲虫 (grassbug)|v1|33 → 0|途切れ / 最少0|37 (37)|—|age:53 / starvation:3 / combat:14|initially-present-lost|
|草棲虫 (grassbug)|v2|33 → 0|途切れ / 最少0|33 (33)|—|combat:27 / age:35 / starvation:4|initially-present-lost|
|重力環 (gravity)|v1|20 → 4|継続 / 最少23|12 (12)|1:4|combat:3 / starvation:11 / age:14|present500|
|重力環 (gravity)|v2|20 → 4|継続 / 最少23|16 (16)|1:3 / 2:1|combat:2 / starvation:6 / age:24|present500|
|抑環 (hyperparasite)|v1|1 → 0|途切れ / 最少0|0 (0)|—|maintenance:1|initially-present-lost|
|抑環 (hyperparasite)|v2|3 → 0|途切れ / 最少0|0 (0)|—|predation:1 / maintenance:1|initially-present-lost|
|浮遊傘 (jelly)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|浮遊傘 (jelly)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|植物共生 (kelp)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|植物共生 (kelp)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|葉環 (leafparasite)|v1|36 → 0|途切れ / 最少0|1 (1)|—|未記録|initially-present-lost|
|葉環 (leafparasite)|v2|45 → 0|途切れ / 最少0|3 (3)|—|未記録|initially-present-lost|
|多眼知覚 (manyeyes)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多眼知覚 (manyeyes)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|記憶殻 (memory)|v1|20 → 29|継続 / 最少24|24 (24)|0:10 / 1:8 / 2:10 / 3:1|combat:1 / starvation:9 / age:5|present500|
|記憶殻 (memory)|v2|20 → 46|継続 / 最少26|50 (50)|1:28 / 2:16 / 3:2|combat:2 / starvation:5 / age:17|present500|
|岩苔 (moss)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|岩苔 (moss)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|神鳥 (myth)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|神鳥 (myth)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|並列生命 (parallel)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|並列生命 (parallel)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|浮遊微藻 (phytoplankton)|v1|7 → 7|継続 / 最少7|0 (0)|0:7|未記録|present500|
|浮遊微藻 (phytoplankton)|v2|7 → 7|継続 / 最少7|0 (0)|0:7|未記録|present500|
|プラズマ生命 (plasma)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|プラズマ生命 (plasma)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|早成甲殻 (precocial)|v1|24 → 3|継続 / 最少25|7 (7)|1:1 / 2:1 / 3:1|starvation:5 / age:23|present500|
|早成甲殻 (precocial)|v2|24 → 7|継続 / 最少24|17 (17)|1:2 / 2:3 / 3:1 / 4:1|age:31 / starvation:3|present500|
|再帰知性 (recursive)|v1|24 → 23|継続 / 最少37|38 (38)|1:7 / 2:12 / 3:3 / 4:1|combat:1 / starvation:17 / age:21|present500|
|再帰知性 (recursive)|v2|24 → 27|継続 / 最少38|43 (43)|1:6 / 2:7 / 3:9 / 4:4 / 5:1|combat:3 / starvation:10 / age:27|present500|
|量機 (ryouki)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|量機 (ryouki)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|光帆 (sail)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|光帆 (sail)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|多頭蛇 (serpent)|v1|24 → 0|継続 / 最少4|1 (1)|—|starvation:17 / age:8|initially-present-lost|
|多頭蛇 (serpent)|v2|24 → 0|途切れ / 最少0|1 (1)|—|starvation:17 / combat:2 / age:6|initially-present-lost|
|日輪 (solar)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|日輪 (solar)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|星冠 (starcrown)|v1|12 → 58|継続 / 最少28|76 (76)|1:7 / 2:18 / 3:21 / 4:6 / 5:4 / 6:2|age:30|present500|
|星冠 (starcrown)|v2|12 → 82|継続 / 最少28|102 (102)|1:5 / 2:23 / 3:31 / 4:14 / 5:6 / 6:2 / 7:1|age:32|present500|
|群体節足 (swarm)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|群体節足 (swarm)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|潮環 (tideparasite)|v1|1 → 0|途切れ / 最少0|1 (1)|—|未記録|initially-present-lost|
|潮環 (tideparasite)|v2|1 → 0|途切れ / 最少0|1 (1)|—|未記録|initially-present-lost|
|異化通信生命 (valis)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|異化通信生命 (valis)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|水游虫 (waterbug)|v1|34 → 23|継続 / 最少23|105 (105)|1:1 / 2:5 / 3:7 / 4:5 / 10:1 / 11:1 / 12:2 / 13:1|combat:113 / starvation:2 / age:1|present500|
|水游虫 (waterbug)|v2|34 → 12|継続 / 最少10|50 (50)|0:1 / 1:1 / 2:3 / 3:1 / 4:2 / 6:1 / 7:2 / 8:1|combat:71 / starvation:1|present500|
|星海鯨 (whale)|v1|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|
|星海鯨 (whale)|v2|0 → 0|途切れ / 最少0|0 (0)|—|未記録|initially-absent-never-observed|

### v1 寄生の実測

実初期 P/Q: 37 / 1。500Tに残る初期ID P/Q: 0 / 0。新実個体ID P/Q: 2 / 0。

|P生物・経路|曝露|侵入試行|侵入|新定着|同一ID移行|除去|放出E|
|---|---:|---:|---:|---:|---:|---:|---:|
|leafparasite / contact|0|0|0|0|0|7|0|
|leafparasite / feeding|287|1|1|1|0|0|16.32|
|leafparasite / carcass|0|5|3|0|2|2|0|
|leafparasite / water|0|0|0|0|0|0|0|
|tideparasite / contact|0|0|0|0|0|1|0|
|tideparasite / feeding|18|1|1|1|0|0|0.66|
|tideparasite / carcass|0|0|0|0|0|0|0|
|tideparasite / water|0|0|0|0|0|0|0|

Q窓: 0 P個体 / 0 個体T（うちQ寄生中 0）。接触や成功の数ではありません。

Q侵入試行 0 / 侵入 0 / 定着 0 / 羽化試行 0 / 羽化失敗 0 / 羽化 0 / 卵配置 0 / 次世代定着 0 / 発育E 0。

T0/150/250/500のP段階・Q状態、同一IDの遷移、卵材料の出現、親子IDはJSONへ原値を対応付けて記録しています。初期Q=0は維持失敗と判定しません。流量合計だけで生活環完了とは認定しません。


### v2 寄生の実測

実初期 P/Q: 46 / 3。500Tに残る初期ID P/Q: 0 / 0。新実個体ID P/Q: 4 / 0。

|P生物・経路|曝露|侵入試行|侵入|新定着|同一ID移行|除去|放出E|
|---|---:|---:|---:|---:|---:|---:|---:|
|leafparasite / contact|2|2|1|1|0|15|0.12|
|leafparasite / feeding|357|4|2|2|0|0|17.52|
|leafparasite / carcass|0|1|1|0|1|1|0|
|leafparasite / water|0|0|0|0|0|0|0|
|tideparasite / contact|0|0|0|0|0|1|0|
|tideparasite / feeding|19|1|1|1|0|0|0.66|
|tideparasite / carcass|0|0|0|0|0|0|0|
|tideparasite / water|0|0|0|0|0|0|0|

Q窓: 2 P個体 / 2 個体T（うちQ寄生中 1）。接触や成功の数ではありません。

Q侵入試行 0 / 侵入 0 / 定着 0 / 羽化試行 0 / 羽化失敗 0 / 羽化 0 / 卵配置 0 / 次世代定着 0 / 発育E 0.01。

T0/150/250/500のP段階・Q状態、同一IDの遷移、卵材料の出現、親子IDはJSONへ原値を対応付けて記録しています。初期Q=0は維持失敗と判定しません。流量合計だけで生活環完了とは認定しません。

## 旧I11の同条件v1との照合

- river-0: exact-fingerprint-match
- lake-1: exact-fingerprint-match
- woodland-2: exact-fingerprint-match

## 判定範囲

R1: 全系統の低競争条件・更新証拠が不足。R2: 固定3条件で独立seed数が不足。R3: 継続する固有の支持経路と維持費の帰属は未認定。R4: 終端生態系の独立分布・反復が不足。R5: 同一系譜の生活環は別途原値照合が必要。R6: 創発の因果・反復性は未認定。

実行時間は同時2プロセス下のheadless診断の参考値です。ブラウザ描画・再生速度・最適化の達成値ではありません。
