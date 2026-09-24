-- ชีทพิบูล — Supabase schema
-- รันทั้งไฟล์ใน Supabase Dashboard → SQL Editor (รันซ้ำได้)

-- =========================================================
-- profiles: 1 แถวต่อผู้ใช้ 1 คน สร้างอัตโนมัติเมื่อ login ครั้งแรก
-- =========================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'นักเรียนพิบูล' check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  role         text not null default 'user' check (role in ('user', 'admin')),
  banned       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- =========================================================
-- ใช้ได้เฉพาะอีเมลโรงเรียน — แก้โดเมนที่นี่ที่เดียว (ต้องตรงกับ ALLOWED_EMAIL_DOMAIN ใน lib/constants.ts)
-- =========================================================
create or replace function public.is_school_email(email text)
returns boolean language sql immutable as $$
  select coalesce(lower(email) like '%@pibul.ac.th', false);
$$;

-- กันสมัครด้วยอีเมลอื่นตั้งแต่ต้นทาง (Supabase จะยกเลิกการสร้างบัญชี)
create or replace function public.enforce_school_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not is_school_email(new.email) then
    raise exception 'school_email_only: ใช้ได้เฉพาะอีเมล @pibul.ac.th';
  end if;
  return new;
end $$;

drop trigger if exists enforce_school_email on auth.users;
create trigger enforce_school_email before insert or update of email on auth.users
  for each row execute function public.enforce_school_email();

-- บัญชีเก่าที่ไม่ใช่อีเมลโรงเรียน จะไม่มีสิทธิ์อะไรเลย (ทั้ง user และ admin)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.role = 'admin' and not p.banned and is_school_email(u.email)
  );
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and not p.banned and is_school_email(u.email)
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'นักเรียนพิบูล'), 40),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ผู้ใช้ทั่วไปแก้ role / banned ของตัวเองไม่ได้
create or replace function public.guard_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() เป็น null เมื่อรันจาก SQL Editor / service role
  if auth.uid() is null then return new; end if;
  if (new.role is distinct from old.role or new.banned is distinct from old.banned) and not is_admin() then
    raise exception 'เฉพาะแอดมินเท่านั้นที่เปลี่ยนสิทธิ์ผู้ใช้ได้';
  end if;
  if new.id = auth.uid() and new.role <> 'admin' and old.role = 'admin' then
    raise exception 'แอดมินลดสิทธิ์ตัวเองไม่ได้ ให้แอดมินคนอื่นเปลี่ยนให้';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

alter table public.profiles enable row level security;
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "update own profile or admin" on public.profiles;
create policy "update own profile or admin" on public.profiles for update
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- รายชื่อผู้ใช้พร้อมอีเมล (เฉพาะแอดมิน)
create or replace function public.admin_list_users()
returns table (id uuid, email text, display_name text, avatar_url text, role text, banned boolean,
               created_at timestamptz, sheet_count bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
    select p.id, u.email::text, p.display_name, p.avatar_url, p.role, p.banned, p.created_at,
           (select count(*) from sheets s where s.owner_id = p.id)
    from profiles p join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;

-- =========================================================
-- sheets
-- =========================================================
create table if not exists public.sheets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  owner_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 40),
  title       text not null check (char_length(title) between 3 and 120),
  grade       smallint not null check (grade in (4, 5, 6)),
  subject     text not null check (char_length(subject) <= 40),
  term        smallint not null check (term in (1, 2)),
  exam        text not null check (exam in ('midterm', 'final', 'other')),
  description text check (char_length(description) <= 400),
  file_path   text,
  link_url    text check (link_url is null or link_url ~* '^https?://'),
  like_count  integer not null default 0,
  open_count  integer not null default 0,
  hidden      boolean not null default false,
  constraint has_source check (file_path is not null or link_url is not null)
);
create index if not exists sheets_created_idx on public.sheets (created_at desc);
create index if not exists sheets_owner_idx on public.sheets (owner_id);

-- เจ้าของแก้ได้เฉพาะเนื้อหา ไม่ใช่ยอดหัวใจ/ยอดเปิด/การซ่อน
create or replace function public.guard_sheet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.owner_id := auth.uid(); new.like_count := 0; new.open_count := 0; new.hidden := false;
  else
    new.owner_id := old.owner_id; new.like_count := old.like_count;
    new.open_count := old.open_count; new.hidden := old.hidden; new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists sheets_guard on public.sheets;
create trigger sheets_guard before insert or update on public.sheets
  for each row when (current_setting('app.bypass_guard', true) is distinct from 'on')
  execute function public.guard_sheet();

alter table public.sheets enable row level security;
drop policy if exists "read sheets" on public.sheets;
create policy "read sheets" on public.sheets for select
  using (hidden = false or owner_id = auth.uid() or is_admin());
drop policy if exists "users insert own sheets" on public.sheets;
create policy "users insert own sheets" on public.sheets for insert to authenticated
  with check (owner_id = auth.uid() and is_active_user());
drop policy if exists "owner or admin update" on public.sheets;
create policy "owner or admin update" on public.sheets for update to authenticated
  using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid() or is_admin());
drop policy if exists "owner or admin delete" on public.sheets;
create policy "owner or admin delete" on public.sheets for delete to authenticated
  using (owner_id = auth.uid() or is_admin());

-- ยอดเปิดอ่าน (ใครก็เพิ่มได้ทีละ 1)
create or replace function public.bump_open(sheet_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);
  update sheets set open_count = open_count + 1 where id = sheet_id and hidden = false;
end $$;
grant execute on function public.bump_open(uuid) to anon, authenticated;

-- =========================================================
-- likes: 1 คน กดหัวใจได้ 1 ครั้งต่อชีท
-- =========================================================
create table if not exists public.likes (
  sheet_id   uuid not null references public.sheets (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sheet_id, user_id)
);

create or replace function public.sync_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guard', 'on', true);
  update sheets set like_count = (select count(*) from likes where sheet_id = coalesce(new.sheet_id, old.sheet_id))
  where id = coalesce(new.sheet_id, old.sheet_id);
  perform set_config('app.bypass_guard', 'off', true);
  return null;
end $$;

drop trigger if exists likes_count on public.likes;
create trigger likes_count after insert or delete on public.likes
  for each row execute function public.sync_like_count();

alter table public.likes enable row level security;
drop policy if exists "read own likes" on public.likes;
create policy "read own likes" on public.likes for select to authenticated using (user_id = auth.uid());
drop policy if exists "like as self" on public.likes;
create policy "like as self" on public.likes for insert to authenticated
  with check (user_id = auth.uid() and is_active_user());
drop policy if exists "unlike as self" on public.likes;
create policy "unlike as self" on public.likes for delete to authenticated using (user_id = auth.uid());

-- =========================================================
-- reports: ผู้ใช้แจ้งปัญหา แอดมินจัดการ
-- =========================================================
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  sheet_id    uuid not null references public.sheets (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason      text not null check (char_length(reason) between 3 and 300),
  resolved    boolean not null default false,
  unique (sheet_id, reporter_id)
);

alter table public.reports enable row level security;
drop policy if exists "report as self" on public.reports;
create policy "report as self" on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and resolved = false and is_active_user());
drop policy if exists "admin reads reports" on public.reports;
create policy "admin reads reports" on public.reports for select to authenticated using (is_admin());
drop policy if exists "admin updates reports" on public.reports;
create policy "admin updates reports" on public.reports for update to authenticated using (is_admin());
drop policy if exists "admin deletes reports" on public.reports;
create policy "admin deletes reports" on public.reports for delete to authenticated using (is_admin());

-- =========================================================
-- storage: ไฟล์ชีท (อ่านได้ทุกคน / อัปโหลดลงโฟลเดอร์ของตัวเองเท่านั้น)
-- path: <user id>/<uuid>.<ext>
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sheets', 'sheets', true, 20971520, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sheets upload own folder" on storage.objects;
create policy "sheets upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'sheets' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user());
drop policy if exists "sheets delete own or admin" on storage.objects;
create policy "sheets delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'sheets' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =========================================================
-- ตั้งแอดมินคนแรก (แก้อีเมลแล้วรันหลังจาก login ด้วย Google ครั้งแรก)
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'your-name@pibul.ac.th');
-- =========================================================
