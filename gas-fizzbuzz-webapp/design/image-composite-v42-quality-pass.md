# 画像合成 v4.2 — 14系統の二重描画解消・暫定肖像24点の再抽出

実施日: 2026-10-14（日本時間）。工程実行はユーザー承認済み。VALISノードの形式的な状態承認とテスト証跡は区別し、今回の新しい証跡はE13（草案）。

## 今回実施

- v4.1でGitHub本流へ統合済みの14系統画像合成を基準とし、**旧12系統のモック原本から24点（第二/第三相各1点）を再抽出**。
- 旧12系統の相ごとの独立した生物画像に、初期幼体の全身を半透明で重ねて二重の生物に見せる誤りを修正。相Iは元の不変身体、相II/IIIはその系統の生物肖像を主に表示。これらは独立Lv部位を持たない暫定素材なので、説明は`MOCK PORTRAIT`に修正。
- ∅反記銘／⌁VALISでは従来の不変原型2点＋11器官×LV1/2/3計33透明PNGを引き続きレイヤー合成。交差進化時の旧器官の描画と保存も維持。
- モック9枚の原本は`assets/references`へ無加工で保持。元の高解像度モックと暫定切り出しPNGは別ファイル。正確な原本SHA-256は配布物`dist/qa-report-v42.json`に収録。
- 画像抽出過程を`tools/rebuild_lineage_layers.py`、`tools/remove_atlas_labels.py`、`tools/isolate_subjects.py`として再現可能にした。

## 実行環境と限定検証（ローカル配布v4.2）

- 配布ZIP: `fizzbuzz_image_composite_v42.zip`
- SHA-256: `7d33c1735da6ff9ec4d03165361eec9aa4020213ba6145531602ef7345571930`
- 実Node v22の `node --test tests/*.test.cjs`: **34件成功／0失敗**。
- 画像24点のRGBA透明性/実画素/第二第三相の差分、指定9原本の保持を検査: PASS。
- Chromiumで14系統の各図鑑画像が描画され、6系統のCanvas描画呼び出し計測で **旧系統は幼体ボディ重複なし、VALIS・反記銘は不変コアとLV別パーツあり**: PASS。
- ChromiumでVALIS/反記銘/神鳥/日輪の4系統への環境誘導（各500行）と成熟完走: PASS。
- Chromiumで35画像、進化履歴の各相、サーバー正本のFizzBuzz出力/不正応答拒否、420pxモバイル幅、JS例外なし: PASS。

## GitHub反映と境界（重要）

- GitHub `src/composite/app.js` は二重描画を防ぐソース修正を反映済み。
- `tests/composite-v42-render-source.test.cjs`にソース回帰チェックを追加。
- **GitHub実行HTMLの `src/Index.html` と `src/Index.composite-v4.html` は約3MBのため更新がブロックされ、v4.1のまま**。ソースパッチとライブHTMLに版差があるため、GitHub本流の画面がv4.2になったとは言わない。
- v4.2の実行HTMLと24枚の改善画像はローカルZIPに完全収録。`dist/preview.html`/ `dist/GAS_Index.html`が自己完結したHTML。
- 実GAS HtmlService配信・ハードウェアFPS・全旧12系統の本当のLv別パーツ・第4相解放と画質確定は今回未実施。切り出し画像には小さなラベル片が残る場合がある。

## NEXT

FLOW-04: 旧12系統を個別の透明器官へ分解する画像素材制作。GitHub実行HTMLの約3MB更新を可能な転送手段で行い、ソースとバイナリの版差を解消。FLOW-08: 更新されたGitHub実行HTMLと実GASで改めて実機検証。
