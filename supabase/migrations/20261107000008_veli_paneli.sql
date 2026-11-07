-- Faz 6B: Veli Paneli — veli–çocuk bağı ve velinin çocuk verisine erişimi
-- Bağ kurma: öğrenci profilinden 6 haneli "veli kodu" üretir, veli kodu girer (RPC).

alter table public.profiles add column if not exists veli_kodu text unique;

create table public.parent_children (
  veli_id uuid not null references public.profiles (id) on delete cascade,
  ogrenci_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (veli_id, ogrenci_id)
);

alter table public.parent_children enable row level security;

create policy "parent_children_select" on public.parent_children
  for select to authenticated
  using (veli_id = (select auth.uid()) or ogrenci_id = (select auth.uid()));
create policy "parent_children_insert_own" on public.parent_children
  for insert to authenticated with check (veli_id = (select auth.uid()));
create policy "parent_children_delete_own" on public.parent_children
  for delete to authenticated using (veli_id = (select auth.uid()));

revoke all on public.parent_children from anon, authenticated;
grant select, insert, delete on public.parent_children to authenticated;

-- RLS içinde kullanılacak yardımcı: oturumdaki veli, bu öğrencinin velisi mi?
create function public.veli_mi(p_ogrenci uuid) returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.parent_children pc
    where pc.veli_id = auth.uid() and pc.ogrenci_id = p_ogrenci
  );
$$;

-- Öğrencinin kendi veli kodunu üretmesi
create function public.veli_kodu_olustur() returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_kod text;
begin
  if auth.uid() is null then
    raise exception 'Oturum yok';
  end if;
  v_kod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  update public.profiles set veli_kodu = v_kod where id = auth.uid();
  return v_kod;
end;
$$;

-- Velinin kodu girerek çocuğa bağlanması; çocuğun adını döndürür
create function public.veli_bagkur(p_kod text) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_ogrenci uuid; v_ad text;
begin
  if auth.uid() is null then
    raise exception 'Oturum yok';
  end if;
  select id, ad into v_ogrenci, v_ad
    from public.profiles
   where veli_kodu = upper(trim(p_kod))
   limit 1;
  if v_ogrenci is null then
    raise exception 'Bu kodla öğrenci bulunamadı';
  end if;
  if v_ogrenci = auth.uid() then
    raise exception 'Kendi kodunu giremezsin';
  end if;
  insert into public.parent_children (veli_id, ogrenci_id)
  values (auth.uid(), v_ogrenci)
  on conflict do nothing;
  return v_ad;
end;
$$;

-- Veli paneli için çocuk listesi (profil RLS'i delmeden ad getirir)
create function public.cocuklarim() returns table (id uuid, ad text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.ad
    from public.parent_children pc
    join public.profiles p on p.id = pc.ogrenci_id
   where pc.veli_id = auth.uid();
$$;

revoke all on function public.veli_mi(uuid), public.veli_kodu_olustur(), public.veli_bagkur(text), public.cocuklarim() from public, anon;
grant execute on function public.veli_mi(uuid), public.veli_kodu_olustur(), public.veli_bagkur(text), public.cocuklarim() to authenticated;

-- Veli, çocuğunun ödev/maç/randevularını görebilsin
create policy "homework_select_veli" on public.homework
  for select to authenticated using (public.veli_mi(ogrenci_id));

create policy "games_select_veli" on public.games
  for select to authenticated using (public.veli_mi(beyaz_id));

create policy "bookings_select_veli" on public.bookings
  for select to authenticated using (public.veli_mi(ogrenci_id));
