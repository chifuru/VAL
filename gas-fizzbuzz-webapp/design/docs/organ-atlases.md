# 現行ローカルPNG資産

5解剖族（aquatic/avian/crystal/serpent/ethereal）×6独立身体部位×3素材段階と、14系統75器官×3Lvを合成する。engine1用commonの18素材も保持する。計20PNG、111部位群、333領域。

実ファイルはsrc/assets/creatures、出所/SHA/実測領域/根元はdesign/assets/desktop-creatures。build-assets.cjsで出所SHA・寸法・結合設定を検査し、runtime JSONとasset-config.jsを生成する。PNGバイトはimage_gen出力をそのままコピーし、Pythonは読み取り測定にだけ用いる。原モックは変更しない。

本数値/透明境界の検査と、最終美術品質の利用者受入は別に扱う。旧GASアトラスの説明はdesign/archive/gas-runtime/docsへ保存する。
