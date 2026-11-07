-- Faz 5 (düzeltme): görüntülü görüşme kaldırıldı.
-- Canlı ders şimdilik yalnızca ortak tahta + hamle senkronu.
alter table public.live_sessions drop column if exists gorusme_url;
alter table public.live_sessions drop column if exists oda;
