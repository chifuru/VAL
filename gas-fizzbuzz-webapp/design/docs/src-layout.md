# 現行src配置

srcにはWindowsアプリの実行に必要なファイルだけを配置する。

- Index.html: 数字入力と観測画面。
- composite/: 計算、旧保存版解釈、描画、UI、CSS、生成済みPNG領域設定。
- desktop/: Electronホスト、固定IPC、実個体の原子的保存。
- assets/creatures/: 20ローカルPNGとconfig.json。

説明/原モック/画像出典/生成入力はdesign、VALIS定義はvalis、試験はtests、証跡はoperations。package:windowsはsrcとpackageだけをASARへ同梱する。GAS歴史資料はdesign/archive/gas-runtime。
