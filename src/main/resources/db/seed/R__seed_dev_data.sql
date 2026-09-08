-- 開発用シードデータ。local プロファイルでのみ実行される
-- (spring.flyway.locations に classpath:db/seed が追加されるのは local だけ)。
--
-- LEARN: R__ で始まる repeatable migration は、ファイル内容(チェックサム)が変わるたびに再実行される。
-- 何度流れても壊れないよう、すべて "既に在れば何もしない" 形で書く。

-- 認証実装前の "固定の現在ユーザー"。FixedCurrentUserProvider がこの email で引く。
insert into users (email, password, display_name, role, created_at, updated_at)
values ('dev@example.com', '{noop}dev-not-secret', 'Dev User', 'USER', now(), now())
on conflict (email) do nothing;

-- サンプルカテゴリ(owner は上の dev ユーザー)
insert into categories (name, color, owner_id, created_at, updated_at)
select v.name, v.color, u.id, now(), now()
from (values ('仕事', '#4C6EF5'), ('プライベート', '#51CF66')) as v(name, color)
         cross join (select id from users where email = 'dev@example.com') as u
on conflict on constraint uq_categories_owner_name do nothing;

-- サンプルタスク(まだ1件も無いときだけ入れる)
insert into tasks (title, description, status, priority, due_date, category_id, owner_id, created_at, updated_at)
select 'ドキュメントを書く', 'Sprint 1 の progress.md を更新する', 'TODO', 'MEDIUM',
       current_date + 3, c.id, u.id, now(), now()
from (select id from users where email = 'dev@example.com') as u
         left join categories c on c.owner_id = u.id and c.name = '仕事'
where not exists (select 1 from tasks);
