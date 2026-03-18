---
title: "GROUP BY - グループ化と集計"
type: "text"
order: 10
assignment_type: "sql"
---

## GROUP BY句

データをグループに分けて、グループごとに集計します。

### 基本構文

```sql
SELECT カラム, 集計関数
FROM テーブル名
GROUP BY カラム;
```

### ロール別のユーザー数

```sql
SELECT role, COUNT(*) AS 人数
FROM users
GROUP BY role;
```

結果：
```text
 role       │ 人数
────────────┼──────
 admin      │    1
 instructor │    2
 learner    │    5
```

### 部署ごとの集計

```sql
SELECT
  department_id,
  COUNT(*) AS 人数,
  MAX(created_at) AS 最新登録日
FROM users
GROUP BY department_id;
```

### 複数カラムでグループ化

```sql
-- 部署 × ロールの組み合わせで集計
SELECT department_id, role, COUNT(*) AS 人数
FROM users
GROUP BY department_id, role
ORDER BY department_id, role;
```

### HAVING - グループに対する条件

WHERE句はグループ化の**前**にフィルタしますが、HAVING句はグループ化の**後**にフィルタします。

```sql
-- 2人以上いるロールだけ取得
SELECT role, COUNT(*) AS 人数
FROM users
GROUP BY role
HAVING COUNT(*) >= 2;
```

### WHERE と HAVING の違い

```sql
SELECT department_id, COUNT(*) AS 人数
FROM users
WHERE role = 'learner'       -- ① 先に受講者だけに絞る
GROUP BY department_id
HAVING COUNT(*) >= 3;        -- ② 3人以上の部署だけ表示
```

実行順序：
1. `FROM users` - テーブルからデータを取得
2. `WHERE role = 'learner'` - 行をフィルタ
3. `GROUP BY department_id` - グループ化
4. `HAVING COUNT(*) >= 3` - グループをフィルタ
5. `SELECT` - 結果を出力

> ポイント：`GROUP BY` で指定していないカラムは、SELECT句で直接使えません（集計関数の中では使えます）
