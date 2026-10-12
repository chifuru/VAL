# Hello, VALIS — GAS Webアプリ
ブラウザに `Hello, VALIS` を表示する最小のGoogle Apps Script Webアプリです。

- 実装: `src/Code.gs`（GASエディタの Code.gs にコピー）
- 導入・公開手順: `operations/plans/hello-valis.md`
- VALIS構造: `valis/summary/hello-valis.summary.md`
- ローカル確認: `node tests/hello-valis.test.cjs`

GASへの配置・デプロイと実ブラウザでの確認は未実施です。ローカル確認はHtmlServiceスタブを使用し、実環境の動作保証ではありません。
全Nodeは草案です。3中核定義は変更していません。

## 配置とアクセス範囲
VAL リポジトリの `hello-valis/` がプロジェクトルートです。文書内の相対パスはこのディレクトリを基準にします。
GAS は新規プロジェクトとし、閲覧は依頼者と指定メンバーに限定します。
現在の Code.gs は表示処理のみです。アクセス制御はまだ設定されていません。全員公開やURLだけによる制限は採用しません。
限定メンバーを特定し、Googleアカウントと利用環境に合うアクセス制御を決めてからデプロイしてください。
GitHub上のソース公開とGASアプリの閲覧権限は別です。リポジトリの公開設定は変更していません。
