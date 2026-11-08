-- Faz 9: Güvenlik sertleştirme (denetim bulguları)
-- Supabase SQL Editor'da (ya da `supabase db push`) çalıştırın.
--
-- Kapatılan açıklar:
--   C1  parent_children'a doğrudan insert → çocuk verisi sızıntısı
--   C2  reviews tablosunun herkese açık select'i → kullanıcı UUID dizini
--   C3  veli kodunun brute force edilebilmesi (6 hex + hız sınırı yok)
--   H1  posts moderasyon bypass'ı (durum='yayinda' ile insert)
--   H2  coach_profiles insert kilidi yok → sahte "onaylı/doğrulanmış koç"
--   H3  live_sessions: bekleyen derslerin kodlarıyla herkese açık olması
--   H4  koç başvuru PII'si (TSF lisans no vb.) tüm kullanıcılara açık
--   H5  reviews insert'te booking sahipliği kontrolü yok → puan manipülasyonu
--   M   RLS'te rol kontrolü yok → has_role() eklendi
--   M   hesap silme hakkı (KVKK m.7) → hesabimi_sil()

-- ---------------------------------------------------------------------------
-- 0) Rol yardımcısı ve fonksiyon yetkileri
-- ---------------------------------------------------------------------------
create or replace function public.has_role(p_rol public.user_role)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = p_rol
  );
$$;

revoke all on function public.has_role(public.user_role) from public, anon;
grant execute on function public.has_role(public.user_role) to authenticated;

-- RLS içinde kullanılan yardımcılar PUBLIC'e açık kalmasın (defense in depth)
revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

revoke all on function public.veli_mi(uuid) from public, anon;
grant execute on function public.veli_mi(uuid) to authenticated;

revoke all on function public.session_member(uuid) from public, anon;
grant execute on function public.session_member(uuid) to authenticated;

-- Tetikleyici fonksiyonları istemciden çağrılamasın (tetikleyiciler etkilenmez)
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_profile_update() from public, anon, authenticated;
revoke all on function public.guard_coach_profile_update() from public, anon, authenticated;
revoke all on function public.booking_link() from public, anon, authenticated;
revoke all on function public.recalc_coach_rating() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) C1 — parent_children: yalnızca veli_bagkur() RPC'siyle yazılabilsin
--    (aksi halde UUID bilen herkes kendini "veli" yazıp çocuğun verisini okur)
-- ---------------------------------------------------------------------------
drop policy if exists "parent_children_insert_own" on public.parent_children;
revoke insert on public.parent_children from authenticated;

-- coach_students bağı da sadece randevu tetikleyicisiyle kurulsun
drop policy if exists "coach_students_insert_own" on public.coach_students;
revoke insert on public.coach_students from authenticated;

-- ---------------------------------------------------------------------------
-- 2) C2 + H5 — reviews: SELECT daralt, INSERT'i booking sahipliğine bağla
-- ---------------------------------------------------------------------------
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews
  for select to authenticated
  using (
    yazan_id = (select auth.uid())
    or koc_id = (select auth.uid())
    or public.is_moderator()
  );

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (
    yazan_id = (select auth.uid())
    and public.has_role('ogrenci')
    and exists (
      select 1
        from public.bookings b
       where b.id = booking_id
         and b.ogrenci_id = (select auth.uid())
         and b.koc_id = koc_id
         and b.durum = 'onaylandi'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) H1 — posts: rol + durum kilidi (moderasyon bypass'ını kapatır)
-- ---------------------------------------------------------------------------
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated
  with check (
    yazar_id = (select auth.uid())
    and durum = 'bekliyor'
    and ret_gerekce is null
    and public.has_role('koc')
  );

drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts
  for update to authenticated
  using (public.is_moderator() or (yazar_id = (select auth.uid()) and durum = 'bekliyor'))
  with check (public.is_moderator() or (yazar_id = (select auth.uid()) and durum = 'bekliyor'));

-- ---------------------------------------------------------------------------
-- 4) H2 — coach_profiles: insert kilidi + kolon bazlı yetki
-- ---------------------------------------------------------------------------
drop policy if exists "coach_profiles_insert_own" on public.coach_profiles;
create policy "coach_profiles_insert_own" on public.coach_profiles
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.has_role('koc')
    and onay_durumu = 'beklemede'
    and elo_dogrulandi = false
    and puan_ort = 0
    and puan_sayi = 0
    and onaylayan_id is null
    and onay_tarihi is null
  );

revoke insert, update on public.coach_profiles from authenticated;
grant insert (user_id, seviye, elo, tsf_belgeli, yil, fiyat, basvuru_notu, onay_durumu)
  on public.coach_profiles to authenticated;
grant update (seviye, elo, elo_dogrulandi, tsf_belgeli, yil, fiyat,
              basvuru_notu, onay_durumu, ret_gerekce, onaylayan_id, onay_tarihi)
  on public.coach_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 5) H4 — başvuru PII'si: kolon bazlı SELECT + sahibi/moderatör için RPC
-- ---------------------------------------------------------------------------
revoke select on public.coach_profiles from authenticated;
grant select (user_id, seviye, elo, elo_dogrulandi, tsf_belgeli, yil, fiyat,
              puan_ort, puan_sayi, created_at, onay_durumu)
  on public.coach_profiles to authenticated;

-- Kendi başvuru notunu/gerekçesini görebilsin
create or replace function public.koc_basvurum()
returns table (basvuru_notu text, ret_gerekce text, onay_durumu text, onay_tarihi timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select cp.basvuru_notu, cp.ret_gerekce, cp.onay_durumu::text, cp.onay_tarihi
    from public.coach_profiles cp
   where cp.user_id = auth.uid();
$$;

-- Moderatör paneli için tam kayıt (yalnızca moderatöre dolu döner)
create or replace function public.moderator_basvurular()
returns setof public.coach_profiles
language sql
security definer
set search_path = ''
stable
as $$
  select cp.*
    from public.coach_profiles cp
   where public.is_moderator()
   order by cp.created_at desc;
$$;

revoke all on function public.koc_basvurum() from public, anon;
revoke all on function public.moderator_basvurular() from public, anon;
grant execute on function public.koc_basvurum() to authenticated;
grant execute on function public.moderator_basvurular() to authenticated;

-- ---------------------------------------------------------------------------
-- 6) H3 — live_sessions: bekleyen dersler artık listelenemez;
--    katılma atomik RPC ile (kod tahmini / ders ele geçirme kapanır)
-- ---------------------------------------------------------------------------
drop policy if exists "live_sessions_select" on public.live_sessions;
create policy "live_sessions_select" on public.live_sessions
  for select to authenticated
  using (
    beyaz_id = (select auth.uid())
    or siyah_id = (select auth.uid())
    or public.is_moderator()
  );

drop policy if exists "live_sessions_update" on public.live_sessions;
create policy "live_sessions_update" on public.live_sessions
  for update to authenticated
  using (beyaz_id = (select auth.uid()) or siyah_id = (select auth.uid()))
  with check (beyaz_id = (select auth.uid()) or siyah_id = (select auth.uid()));

create or replace function public.live_katil(p_kod text)
returns public.live_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare v public.live_sessions;
begin
  if auth.uid() is null then
    raise exception 'Oturum yok';
  end if;

  -- for update: iki kişi aynı anda katılamasın
  select * into v
    from public.live_sessions
   where kod = upper(trim(p_kod))
     and durum = 'bekliyor'
     and siyah_id is null
   for update;

  if not found then
    raise exception 'Bu kodla açık ders bulunamadı';
  end if;
  if v.beyaz_id = auth.uid() then
    raise exception 'Kendi dersine katılamazsın';
  end if;

  update public.live_sessions
     set siyah_id = auth.uid(), durum = 'aktif', updated_at = now()
   where id = v.id
   returning * into v;

  return v;
end;
$$;

revoke all on function public.live_katil(text) from public, anon;
grant execute on function public.live_katil(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) C3 — veli kodu: 40 bit entropi + 30 dakikada 10 deneme sınırı + rol kontrolü
-- ---------------------------------------------------------------------------
create table if not exists public.veli_kod_deneme (
  veli_id uuid primary key references public.profiles (id) on delete cascade,
  sayi int not null default 0,
  pencere timestamptz not null default now()
);
alter table public.veli_kod_deneme enable row level security;
revoke all on public.veli_kod_deneme from anon, authenticated;

create or replace function public.veli_kodu_olustur()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_kod text;
begin
  if auth.uid() is null then
    raise exception 'Oturum yok';
  end if;
  if not public.has_role('ogrenci') then
    raise exception 'Yalnızca öğrenci hesabı veli kodu üretebilir';
  end if;

  -- 10 hex karakter = 40 bit (~1.1e12 olasılık)
  v_kod := upper(substr(
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    1, 10));

  update public.profiles set veli_kodu = v_kod where id = auth.uid();
  return v_kod;
end;
$$;

revoke all on function public.veli_kodu_olustur() from public, anon;
grant execute on function public.veli_kodu_olustur() to authenticated;

create or replace function public.veli_bagkur(p_kod text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_ogrenci uuid; v_ad text; v_sayi int; v_pencere timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Oturum yok';
  end if;
  if not public.has_role('veli') then
    raise exception 'Yalnızca veli hesabı bağlanabilir';
  end if;

  insert into public.veli_kod_deneme (veli_id) values (auth.uid())
  on conflict (veli_id) do nothing;

  select sayi, pencere into v_sayi, v_pencere
    from public.veli_kod_deneme
   where veli_id = auth.uid()
   for update;

  if v_pencere < now() - interval '30 minutes' then
    update public.veli_kod_deneme set sayi = 0, pencere = now() where veli_id = auth.uid();
    v_sayi := 0;
  end if;

  -- KİLİT: 30 dakikada 10 denemeden sonra hiçbir kod kabul edilmez.
  -- DİKKAT: burada raise KULLANILMAZ; raise edilirse sayaç artışı rollback olur
  -- ve hız sınırı işe yaramaz. Bu yüzden null dönüyoruz.
  if v_sayi >= 10 then
    return null;
  end if;

  select id, ad into v_ogrenci, v_ad
    from public.profiles
   where veli_kodu = upper(trim(p_kod))
     and rol = 'ogrenci'
   limit 1;

  if v_ogrenci is null or v_ogrenci = auth.uid() then
    update public.veli_kod_deneme set sayi = sayi + 1 where veli_id = auth.uid();
    return null;
  end if;

  insert into public.parent_children (veli_id, ogrenci_id)
  values (auth.uid(), v_ogrenci)
  on conflict do nothing;

  update public.veli_kod_deneme set sayi = 0 where veli_id = auth.uid();
  return v_ad;
end;
$$;

revoke all on function public.veli_bagkur(text) from public, anon;
grant execute on function public.veli_bagkur(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Rol kontrolü — ödev atama ve randevu
-- ---------------------------------------------------------------------------
drop policy if exists "homework_insert_own" on public.homework;
create policy "homework_insert_own" on public.homework
  for insert to authenticated
  with check (
    (
      ogrenci_id = (select auth.uid())
      and koc_id is null
      and public.has_role('ogrenci')
    )
    or (
      koc_id = (select auth.uid())
      and public.has_role('koc')
      and exists (
        select 1 from public.coach_students cs
         where cs.koc_id = (select auth.uid())
           and cs.ogrenci_id = homework.ogrenci_id
      )
    )
  );

drop policy if exists "bookings_insert_own" on public.bookings;
create policy "bookings_insert_own" on public.bookings
  for insert to authenticated
  with check (
    ogrenci_id = (select auth.uid())
    and durum = 'onaylandi'
    and tarih >= current_date
    and exists (
      select 1 from public.availability a
       where a.koc_id = bookings.koc_id
         and a.gun = extract(isodow from bookings.tarih)::smallint
         and a.saat = bookings.saat
    )
  );

-- ---------------------------------------------------------------------------
-- 9) Hesap silme hakkı (KVKK m.7 / GDPR m.17)
--    profiles → ON DELETE CASCADE sayesinde bağlı tüm kayıtlar da silinir.
-- ---------------------------------------------------------------------------
create or replace function public.hesabimi_sil()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Oturum yok';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.hesabimi_sil() from public, anon;
grant execute on function public.hesabimi_sil() to authenticated;
