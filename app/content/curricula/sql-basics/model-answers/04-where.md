## 練習問題 模範解答

### 問題1: 複合条件のWHERE句

```sql
SELECT *
FROM products
WHERE price BETWEEN 500 AND 3000
  AND category = '文房具';
```

または `BETWEEN` を使わず書く場合:

```sql
SELECT *
FROM products
WHERE price >= 500
  AND price <= 3000
  AND category = '文房具';
```

---

### 問題2: NULLの比較バグを修正

**問題のあるSQL:**
```sql
SELECT * FROM users WHERE department_id = NULL;  -- ❌ バグ
```

**正しいSQL:**
```sql
SELECT * FROM users WHERE department_id IS NULL;  -- ✅
```

**理由**: SQLでは `NULL = NULL` は `TRUE` にならず `NULL` になる。NULLは「値が不明」を意味するため、等号比較が使えない。NULLを検索するには必ず `IS NULL`（または `IS NOT NULL`）を使う。

---

### 問題3: LIKE パターンの違い

| パターン | 意味 | マッチする例 |
|---------|------|------------|
| `LIKE '%田%'` | 「田」を含む任意の文字列 | 山田、田中、吉田幸子、田村 |
| `LIKE '_田%'` | 「田」の前に1文字だけあり、後ろは任意 | 山田、吉田（1文字+田+任意）、但し「田中」や「山田太郎」の「田」位置が違うものはマッチしない |

**具体例:**
- `'%田%'`: 「山田」「田中」「吉田幸子」「本田」など「田」が**どの位置にあっても**マッチ
- `'_田%'`: 「山田」「吉田」「本田」など「田」の**1文字前に何か1文字ある**ものにマッチ。「田中」（田から始まる）はマッチしない
