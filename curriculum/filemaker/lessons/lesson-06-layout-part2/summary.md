# Lesson 06: まとめ・チェックリスト

## 重要ポイント一覧

### スクリプトトリガの実行順序（FM24-2.4.14）
- [ ] OnObjectEnter → OnObjectKeystroke → OnLayoutKeystroke → OnObjectValidate → OnRecordCommit
- [ ] OnObjectKeystroke は OnLayoutKeystroke より**先に**実行される

### よく使われるトリガ（FM24-2.4.15）
- [ ] OnFirstWindowOpen：ファイルを開いたとき
- [ ] OnLastWindowClose：最後のウインドウを閉じるとき
- [ ] OnLayoutEnter：レイアウトに入るとき
- [ ] OnObjectModify：フィールドの値が変わるたびに
- [ ] OnObjectSave：フィールドを確定するとき

### カスタムメニュー（FM24-2.4.17）
- [ ] 適用方法：[カスタムメニューの管理] / [レイアウト設定] / スクリプトステップ
- [ ] [環境設定] ではカスタムメニューセットの指定は**できない**

---

## 試験対策メモ

```
トリガ実行順序（超頻出）
  入力 → OnObjectEnter
  キー入力 → OnObjectKeystroke（先）→ OnLayoutKeystroke（後）
  確定前 → OnObjectValidate
  確定時 → OnObjectSave
  レコード確定 → OnRecordCommit

カスタムメニュー設定の×パターン
  [環境設定] ダイアログでの設定 → 不可
```

---

## 次のレッスン

**Lesson 07：スクリプトの利用（配点 20%）**

変数・ループ・エラー処理・デバッグを学習します。
