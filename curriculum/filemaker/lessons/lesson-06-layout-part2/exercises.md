# Lesson 06: 演習問題（レイアウト後半）

---

## 例題 4-6

ユーザーがレイアウト上のテキストフィールドに値を入力してレコードを確定したとき、次の5つのスクリプトトリガが、実行される優先順に左から並んでいるものを選択してください。なお、スクリプトトリガはすべて設定されており、実行されるものとします。

- (1) OnLayoutKeystroke
- (2) OnObjectKeystroke
- (3) OnObjectEnter
- (4) OnObjectValidate
- (5) OnRecordCommit

A. (3) → (1) → (2) → (5) → (4)
B. (3) → (1) → (2) → (4) → (5)
C. (3) → (2) → (1) → (4) → (5)
D. (4) → (3) → (1) → (2) → (5)

<details>
<summary>解答と解説を見る</summary>

**解答：C**

**解説：**

正しい実行順序：
```
(3) OnObjectEnter → フィールドに入ったとき（最初に1回）
(2) OnObjectKeystroke → キーを押すたびに（オブジェクト優先）
(1) OnLayoutKeystroke → OnObjectKeystroke の後
(4) OnObjectValidate → フィールド確定前に入力値を検証
(5) OnRecordCommit → レコードが確定するとき
```

**重要ポイント：**
- OnObjectKeystroke は OnLayoutKeystroke より**先に**実行される（オブジェクト優先）
- OnObjectValidate は OnObjectSave より前、OnRecordCommit より前
- OnObjectEnter は最初の1回のみ

**参考：**
- https://help.claris.com/ja/pro-help/content/script-triggers.html

</details>

---

## 例題 4-7

作成したカスタムメニューセットを使用する方法として、**適切でない記述**を選択してください。

A. [環境設定] ダイアログボックスの [一般] タブで、FileMaker Pro アプリケーションのデフォルトのメニューセットとして指定する。

B. [カスタムメニューの管理] ダイアログボックスで、カスタム App ファイルのデフォルトのメニューセットとして指定する。

C. [レイアウト設定] ダイアログボックスで、レイアウトごとに使用するメニューセットを指定する。

D. ブラウズモードで [ツール] メニューの [カスタムメニュー] から使用するメニューセットを選択する。

E. [メニューセットのインストール] スクリプトステップを使ったスクリプトで切り替える。

<details>
<summary>解答と解説を見る</summary>

**解答：A**

**解説：**
- **A（×・不適切）**：[環境設定] ダイアログでカスタムメニューセットをデフォルトとして指定する機能は**ありません**。これが「適切でない記述」です。
- **B（○）**：[カスタムメニューの管理] でファイルのデフォルトを設定できます。
- **C（○）**：[レイアウト設定] でレイアウトごとにメニューセットを指定できます。
- **D（○）**：ブラウズモードの [ツール] メニューから切り替えられます（確認・操作用）。
- **E（○）**：[カスタムメニューのインストール] スクリプトステップで動的に切り替えられます。

**参考：**
- https://help.claris.com/ja/pro-help/content/custom-menus.html

</details>

---

## 補足問題：スクリプトトリガの発動タイミング

次のスクリプトトリガについて、それぞれの発動タイミングとして正しいものをマッチさせてください。

| トリガ | 発動タイミング |
|-------|-------------|
| OnFirstWindowOpen | （A）レイアウトに入るとき |
| OnLastWindowClose | （B）ファイルを開いて最初のウインドウが開くとき |
| OnLayoutEnter | （C）フィールドの値が変わるたびに |
| OnObjectModify | （D）最後のウインドウを閉じるとき |
| OnObjectSave | （E）フィールドの確定（値の保存）時 |

<details>
<summary>解答を見る</summary>

| トリガ | 正しい発動タイミング |
|-------|------------------|
| OnFirstWindowOpen | （B）ファイルを開いて最初のウインドウが開くとき |
| OnLastWindowClose | （D）最後のウインドウを閉じるとき |
| OnLayoutEnter | （A）レイアウトに入るとき |
| OnObjectModify | （C）フィールドの値が変わるたびに |
| OnObjectSave | （E）フィールドの確定（値の保存）時 |

</details>

---

## ポイントまとめ

| 項目 | 重要ポイント |
|------|------------|
| トリガの実行順序 | OnObjectEnter → OnObjectKeystroke → OnLayoutKeystroke → OnObjectValidate → OnRecordCommit |
| カスタムメニューの適用 | 環境設定では不可。[カスタムメニューの管理]・[レイアウト設定]・スクリプトステップで設定 |
| Webビューア | データURLでHTMLを直接表示可能 |
