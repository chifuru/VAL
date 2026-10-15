# 完成版の造形・生体表現の確認

対象commit: 124ab4ce6e89adcf192caf33c4e23f8f1cd3805b / app1.13.0 / ENGINE5 revision4。
確認主体: Codex cloud。利用者日付2026-10-16 Asia/Tokyo。実際の描画画像を表示し確認した。

- finish/finished-scenes.png: 同じN/成熟結果の記録済み1.12.0実場面と、新1.13.0実場面を比較。神鳥/蛇型/浮遊膜/頭足/結晶/植物型の6例。細長い蛇型に残っていた旧首用余白を除き、身体の縦横比へcameraを合わせた。元の模様と輪郭を保持し、より全身を観察しやすい構図とした。
- finish/final-body-comparison.png: 胴体に対する翼/ひれ/膜の追従を旧rendererと比較。材質・動きだけを比べるため、旧rendererのcameraを完成版と同じに揃えている。生物を半透明で二重に重ねず、原画像の同じ中心線へ上半/下半を接続する。
- finish/membrane-coverage.json: 20実個体×3時刻の透明alpha量と、原sourceが不透明な402接続点を実描画alphaで照合。源の細い部位や元から独立した発光節の有無と、描画の欠損を区別する。接地型の下半/垂直根元の追加変形ゼロを単体でも検査。
- 皮膚/鱗/羽の元明暗を残し、微細な陰影と薄い組織の透過光を足した。接地帯へ最大6つの接触影を補い、浮遊型へ床影を加えない。目・口先・原sourceの一体感を保持。
- art/habitat-gallery-1〜4.png: 20実成熟個体に4純生息地を適用した80制御fixture。20個体の系統選択や覚醒条件は変更していない。160sourceセル検証は別途sourceを明示指定する網羅fixture。

baseline-provenance.jsonは、旧rendererの原文SHA/同一archive、cameraだけを揃えるtest helper、元の記録済み画像・N台帳のSHAを記録する。材質の1.5.1比較もcameraを揃え、specializationだけ無効にする。他の実個体・動作検査では有効。全6旧実場面の比較画像はcameraを正規化せず、実際の構図差を表示している。

4本の動画はvideo-inspection.jsonで復号/frame/PTSを確認。固定状態・高DPIの継続Canvas生成ゼロ、実71行/特化131行と全cache上限を検証。CPU計測をGPU/利用者FPSと混同せず、初回準備に残る一時負荷もreportへ記録した。

完成版の実装・検証結果であり、利用者Windows10/11実機での表示倍率/FPSと美術受入は未認定。Nodeの承認状態は全草案を維持する。
