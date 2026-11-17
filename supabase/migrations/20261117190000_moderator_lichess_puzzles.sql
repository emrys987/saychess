-- Allow moderators to add reviewed, open-license puzzles to the shared catalog.
drop policy if exists "puzzles_insert_moderator" on public.puzzles;
create policy "puzzles_insert_moderator" on public.puzzles
  for insert to authenticated
  with check (public.is_moderator());

grant insert (id, tema, baslik, fen, cozum, ipucu) on public.puzzles to authenticated;
