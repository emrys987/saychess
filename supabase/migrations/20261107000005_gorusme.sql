-- Faz 5 (ek): ders bazlı görüntülü görüşme linki
-- Boşsa uygulama Jitsi odasını (oda kolonu) kullanır.
alter table public.live_sessions
  add column if not exists gorusme_url text;
