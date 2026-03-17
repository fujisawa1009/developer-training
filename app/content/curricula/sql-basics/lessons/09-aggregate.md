---
title: "集計関数 - COUNT / SUM / AVG / MAX / MIN"
type: "text"
order: 9
---

## 集計関数

複数のレコードをまとめて計算する関数です。

### 代表的な集計関数

| 関数 | 説明 | 例 |
|------|------|-----|
| `COUNT(*)` | 行数を数える | 全ユーザー数 |
| `COUNT(カラム)` | NULL以外の行数 | メールがあるユーザー数 |
| `SUM(カラム)` | 合計 | 注文金額の合計 |
| `AVG(カラム)` | 平均 | 平均注文金額 |
| `MAX(カラム)` | 最大値 | 最高額の注文 |
| `MIN(カラム)` | 最小値 | 最安値の商品 |

### 使用例

```sql
-- ユーザー数を数える
SELECT COUNT(*) FROM users;

-- 受講者の数
SELECT COUNT(*) FROM users WHERE role = 'learner';

-- 注文金額の合計・平均・最大・最小
SELECT
  SUM(amount)  AS 合計,
  AVG(amount)  AS 平均,
  MAX(amount)  AS 最大,
  MIN(amount)  AS 最小
FROM orders;
```

### COUNTの注意点

```sql
-- COUNT(*) はNULL行も数える
SELECT COUNT(*) FROM users;          -- 結果: 5

-- COUNT(カラム) はNULL行を除外する
SELECT COUNT(department_id) FROM users;  -- 結果: 3（NULLが2件ある場合）
```

### ROUND で小数を丸める

```sql
-- 平均を小数第1位まで表示
SELECT ROUND(AVG(amount), 1) AS 平均金額
FROM orders;
```

> ポイント：集計関数はWHERE句でフィルタした後のデータに対して計算されます。SELECT句での使い方と、次に学ぶGROUP BYとの組み合わせが重要です
