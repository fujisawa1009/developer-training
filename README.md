  開発サーバーを起動
```
  cd app
  npm run dev
```


ログイン情報                                          
http://localhost:3000/login


  ┌────────┬────────────────────────┬─────────────────┐                                 
  │ ロール │     メールアドレス     │   パスワード    │
  ├────────┼────────────────────────┼─────────────────┤                                 
  │ 管理者 │ admin@example.com      │ Admin1234!      │                               
  ├────────┼────────────────────────┼─────────────────┤
  │ 講師   │ instructor@example.com │ Instructor1234! │
  ├────────┼────────────────────────┼─────────────────┤
  │ 受講者 │ learner@example.com    │ Learner1234!    │
  └────────┴────────────────────────┴─────────────────┘

```
  # 起動（開発）
  docker compose up -d

  # ログ確認
  docker compose logs app -f

  # シードデータ投入
  docker compose exec app npx tsx --env-file=.env prisma/seed.ts

  # マイグレーション（スキーマ変更後）
  docker compose exec app npx prisma migrate dev --name 変更内容

  # 停止
  docker compose down

  # 本番起動（.env に本番用変数を設定してから）
  docker compose -f docker-compose.prod.yml up -d

  ```