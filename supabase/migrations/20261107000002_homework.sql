-- Faz 3: ödev sistemi
-- puzzles: tema bazlı hazır setler (koç "seti ekle" deyince ödev olarak kopyalanır)
-- homework: öğrenciye atanmış tek bir pozisyon + çözümü

create table public.puzzles (
  id text primary key,
  tema text not null,              -- 'mat1' | 'catal' | 'kazan'
  baslik text not null,
  fen text not null,
  cozum text[] not null,           -- LAN dizisi, örn {'a1a8'}
  ipucu text not null,
  created_at timestamptz not null default now()
);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  -- Şimdilik ödev, ödevi alan kullanıcının kendisine atanır (koç-öğrenci bağı Faz 4'te).
  ogrenci_id uuid not null references auth.users (id) on delete cascade,
  koc_id uuid references auth.users (id) on delete set null,
  kaynak text not null,            -- 'mac' | 'tema'
  tema text,
  baslik text not null,
  fen text not null,
  cozum text[] not null,
  ipucu text not null,
  durum text not null default 'bekliyor',   -- 'bekliyor' | 'cozuldu'
  deneme int not null default 0,
  sure_sn int not null default 0,
  created_at timestamptz not null default now()
);

create index homework_ogrenci_idx on public.homework (ogrenci_id, created_at desc);

alter table public.puzzles enable row level security;
alter table public.homework enable row level security;

create policy "puzzles_read" on public.puzzles
  for select to authenticated using (true);

create policy "homework_select_own" on public.homework
  for select to authenticated
  using (ogrenci_id = (select auth.uid()) or koc_id = (select auth.uid()));

create policy "homework_insert_own" on public.homework
  for insert to authenticated
  with check (ogrenci_id = (select auth.uid()) or koc_id = (select auth.uid()));

-- Öğrenci yalnızca çözüm durumunu güncelleyebilir.
create policy "homework_update_own" on public.homework
  for update to authenticated
  using (ogrenci_id = (select auth.uid()))
  with check (ogrenci_id = (select auth.uid()));

create policy "homework_delete_own" on public.homework
  for delete to authenticated
  using (ogrenci_id = (select auth.uid()) or koc_id = (select auth.uid()));

revoke all on public.puzzles, public.homework from anon, authenticated;
grant select on public.puzzles to authenticated;
grant select, delete on public.homework to authenticated;
grant insert (ogrenci_id, koc_id, kaynak, tema, baslik, fen, cozum, ipucu) on public.homework to authenticated;
grant update (durum, deneme, sure_sn) on public.homework to authenticated;

-- Hazır setler (her pozisyon chess.js ile doğrulandı: mat1 matla, catal şah çeker, kazan vezir alır).
insert into public.puzzles (id, tema, baslik, fen, cozum, ipucu) values
  ('mat1-1', 'mat1', 'Arka sırada mat', '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', ARRAY['a1a8'], 'Siyah şahın kaçacak karesi var mı? 8. sıra tamamen boş.'),
  ('mat1-2', 'mat1', 'Vezirle köşe matı', '7k/6pp/8/8/8/8/8/Q5K1 w - - 0 1', ARRAY['a1a8'], 'Vezir 8. sıraya gelirse şah nereye gidebilir?'),
  ('mat1-3', 'mat1', 'İkinci kale ile mat', '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1', ARRAY['b1b8'], 'Kale 8. sıraya çıkarsa şahın önü kapalı.'),
  ('catal-1', 'catal', 'At çatalı: şah ve kale', 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', ARRAY['b5c7'], 'Atı öyle bir kareye koy ki hem şahı hem kaleyi tehdit etsin.'),
  ('kazan-1', 'kazan', 'Korunmasız vezir', 'k2q4/8/8/8/8/8/8/3RK3 w - - 0 1', ARRAY['d1d8'], 'Siyah şah veziri korumuyor.')
on conflict (id) do nothing;
