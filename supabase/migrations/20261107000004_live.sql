-- Faz 5: canlı ders (Realtime hamle senkronu + Jitsi odası)
-- Oturum 6 haneli davet koduyla paylaşılır. Hamleler live_moves'a yazılır,
-- iki istemci de postgres_changes ile aynı hamleleri sırayla uygular.

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  kod text not null unique,
  beyaz_id uuid not null references public.profiles (id) on delete cascade,
  siyah_id uuid references public.profiles (id) on delete cascade,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  durum text not null default 'bekliyor',   -- bekliyor | aktif | bitti
  oda text not null,                        -- Jitsi oda adı
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.live_moves (
  id bigserial primary key,
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  ply int not null,
  san text not null,
  from_sq text not null,
  to_sq text not null,
  promotion text,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_id, ply)                  -- aynı sıra iki kez yazılamaz
);

create index live_moves_session_idx on public.live_moves (session_id, ply);

alter table public.live_sessions enable row level security;
alter table public.live_moves enable row level security;

-- RLS içinde live_sessions'a bakarken özyinelemeyi önlemek için security definer fonksiyon
create function public.session_member(p_session uuid) returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.live_sessions s
    where s.id = p_session
      and (s.beyaz_id = auth.uid() or s.siyah_id = auth.uid())
  );
$$;

create policy "live_sessions_select" on public.live_sessions
  for select to authenticated
  using (beyaz_id = (select auth.uid()) or siyah_id = (select auth.uid()) or durum = 'bekliyor');

create policy "live_sessions_insert" on public.live_sessions
  for insert to authenticated with check (beyaz_id = (select auth.uid()));

create policy "live_sessions_update" on public.live_sessions
  for update to authenticated
  using (beyaz_id = (select auth.uid()) or siyah_id = (select auth.uid()) or durum = 'bekliyor')
  with check (beyaz_id = (select auth.uid()) or siyah_id = (select auth.uid()));

create policy "live_moves_select" on public.live_moves
  for select to authenticated using (public.session_member(session_id));

create policy "live_moves_insert" on public.live_moves
  for insert to authenticated with check (public.session_member(session_id));

revoke all on public.live_sessions, public.live_moves from anon, authenticated;
grant select, insert, update on public.live_sessions to authenticated;
grant select, insert on public.live_moves to authenticated;
grant usage, select on sequence public.live_moves_id_seq to authenticated;

-- Realtime yayınına ekle (iki kez çalıştırılabilir olsun diye exception yakalanır)
do $$
begin
  alter publication supabase_realtime add table public.live_moves;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.live_sessions;
exception
  when duplicate_object then null;
end $$;
