## 練習問題 模範解答

### 問題1: インデックスの作成と削除

```sql
-- インデックスを作成
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- インデックスを削除
DROP INDEX idx_orders_user_id;
```

**命名規則の例:** `idx_{テーブル名}_{カラム名}` が一般的。意味のある名前をつけておくと管理しやすい。

---

### 問題2: インデックスの効果評価

**`users.email`（ユニークな値が多い）: インデックスは効果的**
- メールアドレスはユーザーごとに異なる（カーディナリティが高い）
- `WHERE email = 'xxx@example.com'` のような検索でインデックスが使われると、フルスキャンなしに対象行をピンポイントで取得できる
- 実際、UNIQUE制約を設定すると自動でインデックスが作られる

**`users.role`（3種類のみ）: インデックスの効果は限定的**
- 取りうる値が3種類しかなく、カーディナリティが低い
- 例えばlearnersが全体の80%を占める場合、`WHERE role = 'learner'` でインデックスを使ってもほぼフルスキャンと変わらない（DBオプティマイザがインデックスを使わないと判断することもある）
- ただし `WHERE role = 'admin'` など全体の1%以下を取得する場合はインデックスが有効な場合もある

---

### 問題3: EXPLAIN で実行計画を確認する手順

```sql
-- インデックスなしの状態で確認
EXPLAIN SELECT * FROM users WHERE email = 'yamada@example.com';
-- → "Seq Scan on users" が出る（フルスキャン）

-- インデックスを作成
CREATE INDEX idx_users_email ON users(email);

-- インデックスあり状態で再確認
EXPLAIN SELECT * FROM users WHERE email = 'yamada@example.com';
-- → "Index Scan using idx_users_email on users" が出る

-- より詳細な実行時間も確認したい場合
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'yamada@example.com';
```

**出力の見方:**
- `Seq Scan`: シーケンシャルスキャン（全行読み込み）
- `Index Scan`: インデックスを使った検索（高速）
- `cost=0.00..X.XX`: 推定コスト（小さいほど良い）
- `ANALYZE` を使うと実際の実行時間（`actual time=...`）も確認できる
