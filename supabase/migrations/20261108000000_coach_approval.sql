-- Faz 8: Koç başvuru ve onay mekanizması (Moderatör Onay Paneli)
-- Koçlar profil oluşturduğunda durum 'beklemede' olur.
-- Sadece moderatörler onaylayabilir/reddedebilir veya ELO doğrulayabilir.
-- Koç Bul listesinde sadece 'onaylandi' durumdaki koçlar listelenir.

-- 1) Kolonları ekle
alter table public.coach_profiles
  add column if not exists onay_durumu text not null default 'beklemede' check (onay_durumu in ('beklemede', 'onaylandi', 'reddedildi')),
  add column if not exists basvuru_notu text,
  add column if not exists ret_gerekce text,
  add column if not exists onaylayan_id uuid references public.profiles (id),
  add column if not exists onay_tarihi timestamptz;

-- 2) Mevcut kayıtları (demo koçlar dahil) onaylı yap
update public.coach_profiles
set onay_durumu = 'onaylandi', onay_tarihi = now()
where onay_durumu = 'beklemede';

-- 3) Moderatör kontrol fonksiyonu (mevcut değilse garantile)
create or replace function public.is_moderator() returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.rol = 'moderator'
  );
$$;

-- 4) Koç güncellemelerini denetleyen trigger: normal kullanıcı kendi onay durumunu değiştiremez
create or replace function public.guard_coach_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Moderatör değilse ve onay_durumu / ret_gerekce / elo_dogrulandi alanlarına dokunuyorsa engelle
  if not public.is_moderator() then
    if new.onay_durumu is distinct from old.onay_durumu and old.onay_durumu is not null then
      -- Reddedilmiş bir koç profilini tekrar düzenliyorsa otomatik olarak 'beklemede'ye al
      if old.onay_durumu = 'reddedildi' and new.onay_durumu = 'beklemede' then
        new.ret_gerekce := null;
      else
        raise exception 'Onay durumu sadece moderatör tarafından değiştirilebilir';
      end if;
    end if;

    if new.ret_gerekce is distinct from old.ret_gerekce then
      raise exception 'Red gerekçesi sadece moderatör tarafından yazılabilir';
    end if;

    if new.elo_dogrulandi is distinct from old.elo_dogrulandi then
      raise exception 'ELO doğrulaması sadece moderatör tarafından yapılabilir';
    end if;

    -- Reddedilmiş koç başka alanları güncelleyip kaydettiğinde de otomatik beklemede durumuna geçsin
    if old.onay_durumu = 'reddedildi' and new.onay_durumu = 'reddedildi' then
      new.onay_durumu := 'beklemede';
      new.ret_gerekce := null;
    end if;
  else
    -- Moderatör onaylarsa veya reddederse onaylayan_id ve onay_tarihi otomatik set edilsin
    if new.onay_durumu is distinct from old.onay_durumu then
      new.onaylayan_id := auth.uid();
      new.onay_tarihi := now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists coach_profiles_guard on public.coach_profiles;
create trigger coach_profiles_guard
  before update on public.coach_profiles
  for each row execute function public.guard_coach_profile_update();

-- 5) RLS politikaları
drop policy if exists "coach_profiles_read" on public.coach_profiles;
create policy "coach_profiles_read" on public.coach_profiles
  for select to authenticated
  using (onay_durumu = 'onaylandi' or user_id = (select auth.uid()) or public.is_moderator());

drop policy if exists "coach_profiles_update_own" on public.coach_profiles;
drop policy if exists "coach_profiles_update" on public.coach_profiles;
create policy "coach_profiles_update" on public.coach_profiles
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator())
  with check (user_id = (select auth.uid()) or public.is_moderator());

-- 6) Yetkiler
grant update (
  seviye, elo, elo_dogrulandi, tsf_belgeli, yil, fiyat,
  basvuru_notu, onay_durumu, ret_gerekce, onaylayan_id, onay_tarihi
) on public.coach_profiles to authenticated;

