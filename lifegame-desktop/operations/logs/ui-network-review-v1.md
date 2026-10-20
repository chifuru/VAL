# A/B・モックの作業結果照合

対象は `operations/plans/ui-network-review-v1.md`。今回の差分はA1.7/A2/B5/B5.2/B5.3/B5.4/B5.5、仕様/索引/接続契約、モックと対応表、Project Summary Manifest実体。新Node/Manifest初期登録なし。正式状態/親子/層間参照は維持し、既存7Nodeの構造要約へManifest反映を行った。

## 文書照合

既存 `node --test tests/manifest.test.cjs` は1件成功。Nodeの階層/参照/登録/参照先実在、3coreの既定SHAを確認。追加の作業照合は下記の結果。これは文書整合の照合記録であり、ゲームのE層検証済み認定ではない。

```
Document audit: PASS
Nodes: 61 ; updated A/B: A1.7,A2,B5,B5.2,B5.3,B5.4,B5.5
State/hierarchy/references unchanged; all C/D/E nodes and 3 core byte-identical.
Manifest C/D/E summaries byte-identical.
Required intervals/units/missing-B/display-only boundaries and local document links present.
Mock: 1565 x 1005 SHA256 088f853ea05addb0a8f4d15b79517b3fbcb38f0fcc97873a9411c95738b192b5
```

## モックの照合と限界

`design/relationship-network-v1/01-network-five-intervals.png` を作成。上401–500T、下の1–100T/101–200T/201–300T/301–400Tの4図を目視で照合。3つの関係面・凡例・P/QのB未定義注記を含む。画像は説明用の仮データであり、下層の一部資源接続・面間対応線・小図の記号/色の完全一致には生成上のずれが残る。本文/盤面定義を優先し、新しい生態条件やゲーム動作の検証証跡にしない。外観承認は未取得。

## 範囲と残件

C/D/E・src/tests・製品版4.2.32・配布物・3coreは変更していない。ゲーム/性能/Windowsの新規動作検証は未実施。最大軽減の実装・実測、100T境界値や対別作用量の不足照合、既存画面寸法への接続は後続。次FLOW-04/05でC/D影響を整理する。
