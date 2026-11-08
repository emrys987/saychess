-- DEMO KOÇLAR — sadece geliştirme/demo için.
-- Bu hesaplar auth.users'a elle eklenir: giriş YAPAMAZLAR (şifresi yok),
-- ama Koç Bul listesinde görünür ve randevu alınabilir.
-- Supabase → SQL Editor'da bir kez çalıştırın. Tekrar çalıştırmak güvenli (idempotent).
--
-- Kaldırmak için: en alttaki DELETE bloğunun yorumunu kaldırıp çalıştırın.

-- 1) Giriş yapamayan auth kullanıcıları
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated',
    'demo.koc1@saychess.local', '',
    now(), now(), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Elif Yılmaz"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated',
    'demo.koc2@saychess.local', '',
    now(), now(), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Mert Kaya"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated',
    'demo.koc3@saychess.local', '',
    now(), now(), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Zeynep Demir"}'
  )
on conflict (id) do nothing;

-- 2) Profiller (trigger zaten oluşturdu; rol ve tanıtımı burada dolduruyoruz)
update public.profiles set
  rol = 'koc',
  ad = 'Elif Yılmaz',
  bio = 'Çocuklarla çalışıyorum. Derslerde önce oyun, sonra kısa teori; her ders sonunda küçük ödev.'
where id = '11111111-1111-4111-8111-111111111111';

update public.profiles set
  rol = 'koc',
  ad = 'Mert Kaya',
  bio = 'Turnuva deneyimi olan koç. Açılış repertuvarı ve maç analizi üzerine çalışıyoruz.'
where id = '22222222-2222-4222-8222-222222222222';

update public.profiles set
  rol = 'koc',
  ad = 'Zeynep Demir',
  bio = 'Yeni başlayanlar için sabırlı bir başlangıç programı; mat kalıpları ve temel taktikler.'
where id = '33333333-3333-4333-8333-333333333333';

-- 3) Koç bilgileri (puan alanları demo değeridir)
insert into public.coach_profiles (user_id, seviye, elo, elo_dogrulandi, tsf_belgeli, yil, fiyat, puan_ort, puan_sayi, onay_durumu) values
  ('11111111-1111-4111-8111-111111111111', 'Başlangıç', 1450, true,  true,  4, 400, 4.8, 12, 'onaylandi'),
  ('22222222-2222-4222-8222-222222222222', 'Orta',      1780, false, false, 6, 550, 4.5, 7,  'onaylandi'),
  ('33333333-3333-4333-8333-333333333333', 'İleri',     2050, true,  true,  9, 750, 5.0, 3,  'onaylandi')
on conflict (user_id) do update set
  seviye = excluded.seviye,
  elo = excluded.elo,
  elo_dogrulandi = excluded.elo_dogrulandi,
  tsf_belgeli = excluded.tsf_belgeli,
  yil = excluded.yil,
  fiyat = excluded.fiyat,
  puan_ort = excluded.puan_ort,
  puan_sayi = excluded.puan_sayi,
  onay_durumu = excluded.onay_durumu;

-- 4) Haftalık müsaitlik (hafta içi akşam + cumartesi)
insert into public.availability (koc_id, gun, saat)
select k.koc_id, g.gun, s.saat
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid),
  ('22222222-2222-4222-8222-222222222222'::uuid),
  ('33333333-3333-4333-8333-333333333333'::uuid)
) as k(koc_id)
cross join (values (1), (3), (5), (6)) as g(gun)
cross join (values (17), (18), (19)) as s(saat)
on conflict (koc_id, gun, saat) do nothing;

-- 5) Temizlik (isteye bağlı): demo koçları ve tüm bağlı kayıtları siler
-- delete from auth.users where email like 'demo.koc%@saychess.local';
