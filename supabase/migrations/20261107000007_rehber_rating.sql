-- Faz 6: koç–öğrenci bağı, ders sonu puanlama, Satranç Rehberi + moderasyon

-- 1) Koç–öğrenci bağı (randevu alınınca otomatik oluşur)
create table public.coach_students (
  koc_id uuid not null references public.profiles (id) on delete cascade,
  ogrenci_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (koc_id, ogrenci_id)
);

alter table public.coach_students enable row level security;

create policy "coach_students_select" on public.coach_students
  for select to authenticated
  using (koc_id = (select auth.uid()) or ogrenci_id = (select auth.uid()));
create policy "coach_students_insert_own" on public.coach_students
  for insert to authenticated with check (koc_id = (select auth.uid()));
create policy "coach_students_delete_own" on public.coach_students
  for delete to authenticated using (koc_id = (select auth.uid()));

revoke all on public.coach_students from anon, authenticated;
grant select, insert, delete on public.coach_students to authenticated;

create function public.booking_link() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.coach_students (koc_id, ogrenci_id)
  values (new.koc_id, new.ogrenci_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger bookings_link
  after insert on public.bookings
  for each row execute function public.booking_link();

-- 2) Ders sonu puanlama (randevu başına tek yorum)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  koc_id uuid not null references public.profiles (id) on delete cascade,
  yazan_id uuid not null references public.profiles (id) on delete cascade,
  puan smallint not null check (puan between 1 and 5),
  yorum text not null default '',
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "reviews_select" on public.reviews
  for select to authenticated using (true);
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated with check (yazan_id = (select auth.uid()));

revoke all on public.reviews from anon, authenticated;
grant select, insert on public.reviews to authenticated;

create function public.recalc_coach_rating() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_koc uuid;
begin
  v_koc := coalesce(new.koc_id, old.koc_id);
  update public.coach_profiles cp
     set puan_ort = coalesce((select round(avg(puan)::numeric, 1) from public.reviews where koc_id = v_koc), 0),
         puan_sayi = (select count(*) from public.reviews where koc_id = v_koc)
   where cp.user_id = v_koc;
  return null;
end;
$$;

create trigger reviews_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_coach_rating();

-- 3) Satranç Rehberi: koç yazar → moderatör onaylar → yayında
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  yazar_id uuid not null references public.profiles (id) on delete cascade,
  baslik text not null,
  metin text not null,
  durum text not null default 'bekliyor',   -- bekliyor | yayinda | red
  ret_gerekce text,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create function public.is_moderator() returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'moderator'
  );
$$;

create policy "posts_select" on public.posts
  for select to authenticated
  using (durum = 'yayinda' or yazar_id = (select auth.uid()) or public.is_moderator());
create policy "posts_insert_own" on public.posts
  for insert to authenticated with check (yazar_id = (select auth.uid()));
create policy "posts_update" on public.posts
  for update to authenticated
  using (public.is_moderator() or (yazar_id = (select auth.uid()) and durum = 'bekliyor'))
  with check (public.is_moderator() or yazar_id = (select auth.uid()));

revoke all on public.posts from anon, authenticated;
grant select, insert on public.posts to authenticated;
grant update (durum, ret_gerekce, baslik, metin) on public.posts to authenticated;
