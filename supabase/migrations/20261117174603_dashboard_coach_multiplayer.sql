-- Ana sayfa hatirlaticilari, zorunlu koc basvurusu ve kodlu multiplayer oyunlari.

-- ---------------------------------------------------------------------------
-- Koç başvurusu: kanıtı yalnızca başvuru sahibi ve moderatör okuyabilir.
-- ---------------------------------------------------------------------------
alter table public.coach_profiles
  add column if not exists elo_kanit text;

grant insert (user_id, seviye, elo, elo_kanit, tsf_belgeli, yil, fiyat, basvuru_notu, onay_durumu)
  on public.coach_profiles to authenticated;
grant update (seviye, elo, elo_kanit, elo_dogrulandi, tsf_belgeli, yil, fiyat,
              basvuru_notu, onay_durumu, ret_gerekce, onaylayan_id, onay_tarihi)
  on public.coach_profiles to authenticated;

drop function if exists public.koc_basvurum();
create function public.koc_basvurum()
returns table (
  basvuru_notu text,
  ret_gerekce text,
  onay_durumu text,
  onay_tarihi timestamptz,
  elo_kanit text
)
language sql
security definer
set search_path = ''
stable
as $$
  select cp.basvuru_notu, cp.ret_gerekce, cp.onay_durumu::text, cp.onay_tarihi, cp.elo_kanit
    from public.coach_profiles cp
   where cp.user_id = (select auth.uid());
$$;

create or replace function public.koc_basvuru_gonder(
  p_seviye text,
  p_elo integer,
  p_elo_kanit text,
  p_fiyat integer,
  p_yil integer,
  p_tsf_belgeli boolean
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ad text;
  v_bio text;
  v_user_id uuid;
  v_status text;
  v_elo_kanit text := nullif(trim(p_elo_kanit), '');
begin
  if auth.uid() is null or not public.has_role('koc') then
    raise exception 'Koç başvurusu için koç rolüyle giriş yapmalısın';
  end if;
  if p_seviye not in ('Başlangıç', 'Orta', 'İleri') then
    raise exception 'Geçerli bir hedef öğrenci seviyesi seç';
  end if;
  if p_yil is null or p_yil < 0 or p_yil > 80 then
    raise exception 'Deneyim yılı 0 ile 80 arasında olmalı';
  end if;
  if p_fiyat is null or p_fiyat < 1 or p_fiyat > 100000 then
    raise exception 'Ders ücreti geçerli bir sayı olmalı';
  end if;
  if p_elo is not null and (p_elo < 1 or p_elo > 4000 or v_elo_kanit is null) then
    raise exception 'ELO için geçerli bir değer ve doğrulama kanıtı gerekli';
  end if;
  if v_elo_kanit is not null and length(v_elo_kanit) > 1000 then
    raise exception 'ELO kanıtı en fazla 1000 karakter olabilir';
  end if;

  select p.ad, p.bio into v_ad, v_bio
    from public.profiles p
   where p.id = (select auth.uid());
  if nullif(trim(v_ad), '') is null or nullif(trim(v_bio), '') is null then
    raise exception 'Ad soyad ve tanıtım yazısı zorunludur';
  end if;

  insert into public.coach_profiles (
    user_id, seviye, elo, elo_kanit, fiyat, yil, tsf_belgeli, onay_durumu
  ) values (
    (select auth.uid()), p_seviye, p_elo, v_elo_kanit, p_fiyat, p_yil, coalesce(p_tsf_belgeli, false), 'beklemede'
  )
  on conflict (user_id) do update set
    seviye = excluded.seviye,
    elo = excluded.elo,
    elo_kanit = excluded.elo_kanit,
    fiyat = excluded.fiyat,
    yil = excluded.yil,
    tsf_belgeli = excluded.tsf_belgeli,
    onay_durumu = case when public.coach_profiles.onay_durumu = 'onaylandi' then 'onaylandi' else 'beklemede' end,
    ret_gerekce = null
  where public.coach_profiles.onay_durumu in ('beklemede', 'reddedildi', 'onaylandi')
  returning user_id, onay_durumu into v_user_id, v_status;

  if v_user_id is null then
    raise exception 'Onaylanmış koç profili başvuru formundan değiştirilemez';
  end if;
  return v_status;
end;
$$;

revoke all on function public.koc_basvurum() from public, anon;
grant execute on function public.koc_basvurum() to authenticated;
revoke all on function public.koc_basvuru_gonder(text, integer, text, integer, integer, boolean) from public, anon;
grant execute on function public.koc_basvuru_gonder(text, integer, text, integer, integer, boolean) to authenticated;

-- Doğrudan API yazımlarında da zorunlu koç bilgileri ve pending durumunu uygula.
create or replace function public.guard_coach_application_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ad text;
  v_bio text;
begin
  if public.is_moderator() then
    return new;
  end if;
  if new.user_id <> (select auth.uid()) or not public.has_role('koc') then
    raise exception 'Yalnızca kendi koç başvurunu gönderebilirsin';
  end if;
  if new.seviye not in ('Başlangıç', 'Orta', 'İleri')
     or new.yil < 0 or new.yil > 80 or new.fiyat < 1 or new.fiyat > 100000
     or (new.elo is not null and (new.elo < 1 or new.elo > 4000 or nullif(trim(new.elo_kanit), '') is null))
     or length(new.elo_kanit) > 1000 then
    raise exception 'Koç başvuru bilgileri eksik veya geçersiz';
  end if;
  select p.ad, p.bio into v_ad, v_bio from public.profiles p where p.id = new.user_id;
  if nullif(trim(v_ad), '') is null or nullif(trim(v_bio), '') is null then
    raise exception 'Ad soyad ve tanıtım yazısı zorunludur';
  end if;
  return new;
end;
$$;

drop trigger if exists coach_profiles_application_fields on public.coach_profiles;
create trigger coach_profiles_application_fields
  before insert or update on public.coach_profiles
  for each row execute function public.guard_coach_application_fields();

-- Profil değişikliği ELO'yu etkiliyorsa doğrulama işaretini sıfırla.
create or replace function public.guard_coach_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    if new.user_id <> (select auth.uid()) then
      raise exception 'Yalnızca kendi koç profilini düzenleyebilirsin';
    end if;
    if new.onay_durumu is distinct from old.onay_durumu then
      if old.onay_durumu = 'reddedildi' and new.onay_durumu = 'beklemede' then
        new.ret_gerekce := null;
      else
        raise exception 'Onay durumu sadece moderatör tarafından değiştirilebilir';
      end if;
    end if;
    if new.ret_gerekce is distinct from old.ret_gerekce then
      raise exception 'Red gerekçesi sadece moderatör tarafından yazılabilir';
    end if;
    if new.elo is distinct from old.elo or new.elo_kanit is distinct from old.elo_kanit then
      new.elo_dogrulandi := false;
    elsif new.elo_dogrulandi is distinct from old.elo_dogrulandi then
      raise exception 'ELO doğrulaması sadece moderatör tarafından yapılabilir';
    end if;
    if old.onay_durumu = 'reddedildi' and new.onay_durumu = 'reddedildi' then
      new.onay_durumu := 'beklemede';
      new.ret_gerekce := null;
    end if;
  else
    if new.onay_durumu is distinct from old.onay_durumu then
      new.onaylayan_id := auth.uid();
      new.onay_tarihi := now();
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists "availability_insert_own" on public.availability;
create policy "availability_insert_own" on public.availability
  for insert to authenticated
  with check (
    koc_id = (select auth.uid())
    and exists (
      select 1 from public.coach_profiles cp
       where cp.user_id = (select auth.uid()) and cp.onay_durumu = 'onaylandi'
    )
  );
drop policy if exists "availability_delete_own" on public.availability;
create policy "availability_delete_own" on public.availability
  for delete to authenticated
  using (
    koc_id = (select auth.uid())
    and exists (
      select 1 from public.coach_profiles cp
       where cp.user_id = (select auth.uid()) and cp.onay_durumu = 'onaylandi'
    )
  );

drop policy if exists "homework_insert_own" on public.homework;
create policy "homework_insert_own" on public.homework
  for insert to authenticated
  with check (
    (ogrenci_id = (select auth.uid()) and koc_id is null and public.has_role('ogrenci'))
    or (
      koc_id = (select auth.uid())
      and public.has_role('koc')
      and exists (
        select 1 from public.coach_profiles cp
         where cp.user_id = (select auth.uid()) and cp.onay_durumu = 'onaylandi'
      )
      and exists (
        select 1 from public.coach_students cs
         where cs.koc_id = (select auth.uid()) and cs.ogrenci_id = homework.ogrenci_id
      )
    )
  );

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated
  with check (
    yazar_id = (select auth.uid())
    and durum = 'bekliyor'
    and public.has_role('koc')
    and exists (
      select 1 from public.coach_profiles cp
       where cp.user_id = (select auth.uid()) and cp.onay_durumu = 'onaylandi'
    )
  );

-- ---------------------------------------------------------------------------
-- Multiplayer: oda tipi, saat bilgisi ve bitmiş oyunun kaydı.
-- ---------------------------------------------------------------------------
alter table public.live_sessions
  add column if not exists oyun_turu text not null default 'ders' check (oyun_turu in ('ders', 'oyun')),
  add column if not exists saat_modu text not null default 'yok' check (saat_modu in ('yok', '5+3')),
  add column if not exists beyaz_saniye numeric(8,3) not null default 300,
  add column if not exists siyah_saniye numeric(8,3) not null default 300,
  add column if not exists saat_basladi_at timestamptz,
  add column if not exists sonuc text,
  add column if not exists bitis_sebebi text,
  add column if not exists pgn text,
  add column if not exists plies integer not null default 0;

alter table public.games
  add column if not exists live_session_id uuid unique references public.live_sessions(id) on delete set null;

revoke insert, update on public.live_sessions from authenticated;
grant select on public.live_sessions to authenticated;
grant insert (kod, beyaz_id, oyun_turu, saat_modu) on public.live_sessions to authenticated;
revoke insert on public.live_moves from authenticated;
grant select on public.live_moves to authenticated;
revoke usage, select on sequence public.live_moves_id_seq from authenticated;

drop function if exists public.live_katil(text);
create function public.live_katil(p_kod text, p_oyun_turu text)
returns public.live_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.live_sessions;
begin
  if auth.uid() is null then raise exception 'Oturum yok'; end if;
  if p_oyun_turu not in ('ders', 'oyun') then raise exception 'Geçersiz oda türü'; end if;
  select * into v
    from public.live_sessions
   where kod = upper(trim(p_kod))
     and durum = 'bekliyor'
     and siyah_id is null
     and oyun_turu = p_oyun_turu
   for update;
  if not found then raise exception 'Bu kodla açık oda bulunamadı'; end if;
  if v.beyaz_id = auth.uid() then raise exception 'Kendi odana katılamazsın'; end if;
  update public.live_sessions
     set siyah_id = auth.uid(),
         durum = 'aktif',
         saat_basladi_at = case when v.oyun_turu = 'oyun' and v.saat_modu = '5+3' then now() else null end,
         updated_at = now()
   where id = v.id
   returning * into v;
  return v;
end;
$$;

create or replace function public.live_hamle_yap(
  p_session_id uuid,
  p_ply integer,
  p_san text,
  p_from text,
  p_to text,
  p_promotion text,
  p_fen text,
  p_pgn text
)
returns public.live_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.live_sessions;
  v_turn text;
  v_expected_user uuid;
  v_elapsed numeric(8,3);
  v_white_seconds numeric(8,3);
  v_black_seconds numeric(8,3);
begin
  if auth.uid() is null then raise exception 'Oturum yok'; end if;
  select * into v from public.live_sessions where id = p_session_id for update;
  if not found or v.durum <> 'aktif' then raise exception 'Oda aktif değil'; end if;
  if auth.uid() <> v.beyaz_id and auth.uid() <> v.siyah_id then raise exception 'Bu odanın oyuncusu değilsin'; end if;
  v_turn := split_part(v.fen, ' ', 2);
  v_expected_user := case when v_turn = 'w' then v.beyaz_id else v.siyah_id end;
  if auth.uid() <> v_expected_user then raise exception 'Sıra sende değil'; end if;
  if p_ply <> v.plies + 1 then raise exception 'Tahta güncel değil, hamleleri yenile'; end if;
  if nullif(trim(p_san), '') is null or length(p_san) > 16
     or p_from !~ '^[a-h][1-8]$' or p_to !~ '^[a-h][1-8]$'
     or split_part(p_fen, ' ', 2) = v_turn then
    raise exception 'Geçersiz hamle';
  end if;
  if length(p_fen) > 160 or length(p_pgn) > 12000 then raise exception 'Oyun verisi çok büyük'; end if;

  v_white_seconds := v.beyaz_saniye;
  v_black_seconds := v.siyah_saniye;
  if v.oyun_turu = 'oyun' and v.saat_modu = '5+3' then
    v_elapsed := greatest(0, extract(epoch from (now() - coalesce(v.saat_basladi_at, now())))::numeric(8,3));
    if v_turn = 'w' then
      v_white_seconds := v.beyaz_saniye - v_elapsed;
      if v_white_seconds <= 0 then raise exception 'Süren doldu'; end if;
      v_white_seconds := v_white_seconds + 3;
    else
      v_black_seconds := v.siyah_saniye - v_elapsed;
      if v_black_seconds <= 0 then raise exception 'Süren doldu'; end if;
      v_black_seconds := v_black_seconds + 3;
    end if;
  end if;

  insert into public.live_moves (session_id, ply, san, from_sq, to_sq, promotion, user_id)
  values (v.id, p_ply, p_san, p_from, p_to, p_promotion, auth.uid());
  update public.live_sessions
     set fen = p_fen,
         pgn = p_pgn,
         plies = p_ply,
         beyaz_saniye = v_white_seconds,
         siyah_saniye = v_black_seconds,
         saat_basladi_at = case when v.oyun_turu = 'oyun' and v.saat_modu = '5+3' then now() else null end,
         updated_at = now()
   where id = v.id
   returning * into v;
  return v;
end;
$$;

create or replace function public.live_oyun_bitir(
  p_session_id uuid,
  p_bitis_sebebi text,
  p_pgn text,
  p_plies integer
)
returns public.live_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.live_sessions;
  v_turn text;
  v_result text;
  v_elapsed numeric(8,3);
  v_white_seconds numeric(8,3);
  v_black_seconds numeric(8,3);
begin
  if auth.uid() is null then raise exception 'Oturum yok'; end if;
  select * into v from public.live_sessions where id = p_session_id for update;
  if not found or v.oyun_turu <> 'oyun' then raise exception 'Multiplayer oyunu bulunamadı'; end if;
  if auth.uid() <> v.beyaz_id and auth.uid() <> v.siyah_id then raise exception 'Bu odanın oyuncusu değilsin'; end if;
  if v.durum = 'bitti' then return v; end if;
  v_turn := split_part(v.fen, ' ', 2);
  v_white_seconds := v.beyaz_saniye;
  v_black_seconds := v.siyah_saniye;

  if p_bitis_sebebi = 'Beraberlik' then
    v_result := '1/2-1/2';
  elsif p_bitis_sebebi = 'Mat' then
    v_result := case when v_turn = 'w' then '0-1' else '1-0' end;
  elsif p_bitis_sebebi = 'Teslim' then
    if auth.uid() <> (case when v_turn = 'w' then v.beyaz_id else v.siyah_id end) then
      raise exception 'Yalnızca sırası gelen oyuncu teslim olabilir';
    end if;
    v_result := case when v_turn = 'w' then '0-1' else '1-0' end;
  elsif p_bitis_sebebi = 'Süre bitti' then
    if v.saat_modu <> '5+3' then raise exception 'Bu oyunda saat kullanılmıyor'; end if;
    v_elapsed := greatest(0, extract(epoch from (now() - coalesce(v.saat_basladi_at, now())))::numeric(8,3));
    if v_turn = 'w' then
      v_white_seconds := v.beyaz_saniye - v_elapsed;
      if v_white_seconds > 0 then raise exception 'Beyazın süresi henüz dolmadı'; end if;
      v_result := '0-1';
    else
      v_black_seconds := v.siyah_saniye - v_elapsed;
      if v_black_seconds > 0 then raise exception 'Siyahın süresi henüz dolmadı'; end if;
      v_result := '1-0';
    end if;
  else
    raise exception 'Geçersiz bitiş nedeni';
  end if;
  if p_plies <> v.plies or length(p_pgn) > 12000 then raise exception 'Oyun kaydı güncel değil'; end if;

  update public.live_sessions
     set durum = 'bitti', sonuc = v_result, bitis_sebebi = p_bitis_sebebi,
         pgn = p_pgn, saat_basladi_at = null,
         beyaz_saniye = greatest(v_white_seconds, 0),
         siyah_saniye = greatest(v_black_seconds, 0), updated_at = now()
   where id = v.id
   returning * into v;

  insert into public.games (beyaz_id, siyah_id, pgn, sonuc, bitis_sebebi, plies, live_session_id)
  values (v.beyaz_id, v.siyah_id, p_pgn, v_result, p_bitis_sebebi, p_plies, v.id)
  on conflict (live_session_id) do nothing;
  return v;
end;
$$;

revoke all on function public.live_katil(text, text) from public, anon;
grant execute on function public.live_katil(text, text) to authenticated;
revoke all on function public.live_hamle_yap(uuid, integer, text, text, text, text, text, text) from public, anon;
grant execute on function public.live_hamle_yap(uuid, integer, text, text, text, text, text, text) to authenticated;
revoke all on function public.live_oyun_bitir(uuid, text, text, integer) from public, anon;
grant execute on function public.live_oyun_bitir(uuid, text, text, integer) to authenticated;
