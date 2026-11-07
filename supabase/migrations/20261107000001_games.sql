-- Faz 2: oynanan maçlar
-- Şimdilik iki rol tek cihazda oynuyor: beyaz taraf giriş yapan kullanıcı, siyah taraf boş (yerel).
-- Gerçek eşleşmede iki taraf da doldurulacak.

create table public.games (
  id uuid primary key default gen_random_uuid(),
  beyaz_id uuid references auth.users (id) on delete set null,
  siyah_id uuid references auth.users (id) on delete set null,
  pgn text not null,
  sonuc text not null,        -- '1-0' | '0-1' | '1/2-1/2'
  bitis_sebebi text,          -- 'Mat' | 'Teslim' | 'Süre bitti' | 'Beraberlik'
  plies int not null default 0,
  created_at timestamptz not null default now()
);

create index games_beyaz_idx on public.games (beyaz_id, created_at desc);
create index games_siyah_idx on public.games (siyah_id, created_at desc);

alter table public.games enable row level security;

create policy "games_select_own" on public.games
  for select to authenticated
  using (beyaz_id = (select auth.uid()) or siyah_id = (select auth.uid()));

create policy "games_insert_own" on public.games
  for insert to authenticated
  with check (beyaz_id = (select auth.uid()) or siyah_id = (select auth.uid()));

revoke all on public.games from anon, authenticated;
grant select, insert on public.games to authenticated;
