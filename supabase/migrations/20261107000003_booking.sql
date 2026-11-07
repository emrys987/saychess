-- Faz 4: koç profili, müsaitlik, randevu
-- Koç Bul listesi coach_profiles + profiles'tan beslenir.
-- Randevu çakışması veritabanındaki unique kısıtıyla engellenir.

create table public.coach_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  seviye text not null default 'Başlangıç',   -- Başlangıç | Orta | İleri
  elo int,
  elo_dogrulandi boolean not null default false,
  tsf_belgeli boolean not null default false,
  yil int not null default 0,                 -- deneyim yılı
  fiyat int not null default 0,               -- 45 dk ders ücreti (TL)
  puan_ort numeric(3, 1) not null default 0,  -- Faz 6'da yorumlardan hesaplanacak
  puan_sayi int not null default 0,
  created_at timestamptz not null default now()
);

-- Haftalık tekrar eden müsaitlik: 1 = Pazartesi ... 7 = Pazar
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  koc_id uuid not null references public.profiles (id) on delete cascade,
  gun smallint not null check (gun between 1 and 7),
  saat smallint not null check (saat between 0 and 23),
  unique (koc_id, gun, saat)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  koc_id uuid not null references public.profiles (id) on delete cascade,
  ogrenci_id uuid not null references public.profiles (id) on delete cascade,
  tarih date not null,
  saat smallint not null check (saat between 0 and 23),
  durum text not null default 'onaylandi',    -- onaylandi | iptal
  created_at timestamptz not null default now(),
  unique (koc_id, tarih, saat)
);

create index bookings_koc_idx on public.bookings (koc_id, tarih);
create index bookings_ogrenci_idx on public.bookings (ogrenci_id, tarih);

alter table public.coach_profiles enable row level security;
alter table public.availability enable row level security;
alter table public.bookings enable row level security;

create policy "coach_profiles_read" on public.coach_profiles
  for select to authenticated using (true);
create policy "coach_profiles_insert_own" on public.coach_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "coach_profiles_update_own" on public.coach_profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "availability_read" on public.availability
  for select to authenticated using (true);
create policy "availability_insert_own" on public.availability
  for insert to authenticated with check (koc_id = (select auth.uid()));
create policy "availability_delete_own" on public.availability
  for delete to authenticated using (koc_id = (select auth.uid()));

create policy "bookings_select_own" on public.bookings
  for select to authenticated
  using (koc_id = (select auth.uid()) or ogrenci_id = (select auth.uid()));
create policy "bookings_insert_own" on public.bookings
  for insert to authenticated with check (ogrenci_id = (select auth.uid()));
create policy "bookings_update_own" on public.bookings
  for update to authenticated
  using (koc_id = (select auth.uid()) or ogrenci_id = (select auth.uid()))
  with check (koc_id = (select auth.uid()) or ogrenci_id = (select auth.uid()));

revoke all on public.coach_profiles, public.availability, public.bookings from anon, authenticated;
grant select, insert, update on public.coach_profiles to authenticated;
grant select, insert, delete on public.availability to authenticated;
grant select, insert, update on public.bookings to authenticated;
