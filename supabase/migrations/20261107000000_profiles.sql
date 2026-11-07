-- Faz 1: kullanıcı profilleri + roller
-- Supabase SQL Editor'da çalıştırın (ya da `supabase db push`).

create type public.user_role as enum ('koc', 'ogrenci', 'veli', 'moderator');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol public.user_role,               -- null = henüz rol seçmedi
  ad text not null default '',
  bio text not null default '',
  foto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Herkes kendi profilini görür; koç profilleri "Koç Bul" için herkese açık.
-- Öğrenci/veli profilleri gizli (çocuk verisi). İlişkiye dayalı erişim sonraki fazlarda eklenecek.
create policy "profiles_select_own_or_coach" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or rol = 'koc');

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Kolon bazlı yetki: id / created_at istemciden değiştirilemez.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (rol, ad, bio, foto_url) on public.profiles to authenticated;

-- Google ile ilk girişte profil satırını otomatik oluştur.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, ad, foto_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rol yalnızca bir kez seçilebilir ve kullanıcı kendine moderatör rolü veremez.
-- (Moderatör rolü SQL Editor'dan elle verilir; orada current_user 'postgres' olur.)
create function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol and current_user = 'authenticated' then
    if old.rol is not null then
      raise exception 'Rol bir kez seçilir';
    end if;
    if new.rol = 'moderator' then
      raise exception 'Moderatör rolü seçilemez';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();
