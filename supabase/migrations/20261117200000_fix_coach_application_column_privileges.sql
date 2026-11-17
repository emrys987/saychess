-- Keep elo_kanit private while allowing an applicant to resubmit their profile.
-- ON CONFLICT DO UPDATE reads the restricted elo_kanit column and fails under
-- the column-level SELECT grants, so update existing rows separately.
create or replace function public.koc_basvuru_gonder(
  p_seviye text,
  p_elo integer,
  p_elo_kanit text,
  p_fiyat integer,
  p_yil integer,
  p_tsf_belgeli boolean
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ad text;
  v_bio text;
  v_user_id uuid := (select auth.uid());
  v_status text;
  v_elo_kanit text := nullif(trim(p_elo_kanit), '');
begin
  if v_user_id is null or not public.has_role('koc') then
    raise exception 'Koç başvurusu için koç rolüyle giriş yapmalısın';
  end if;
  if p_seviye not in ('Başlangıç', 'Orta', 'İleri') then
    raise exception 'Geçerli bir hedef öğrenci seviyesi seç';
  end if;
  if p_yil is null or p_yil < 0 or p_yil > 80 then
    raise exception 'Deneyim yılı 0 ile 80 arasında olmalı';
  end if;
  if p_fiyat is null or p_fiyat < 1 or p_fiyat > 100000 then
    raise exception 'Ders ücreti geçerli bir sayı olmalı';
  end if;
  if p_elo is not null and (p_elo < 1 or p_elo > 4000 or v_elo_kanit is null) then
    raise exception 'ELO için geçerli bir değer ve doğrulama kanıtı gerekli';
  end if;
  if v_elo_kanit is not null and length(v_elo_kanit) > 1000 then
    raise exception 'ELO kanıtı en fazla 1000 karakter olabilir';
  end if;

  select p.ad, p.bio into v_ad, v_bio
    from public.profiles p
   where p.id = v_user_id;
  if nullif(trim(v_ad), '') is null or nullif(trim(v_bio), '') is null then
    raise exception 'Ad soyad ve tanıtım yazısı zorunludur';
  end if;

  -- This column is explicitly readable only through koc_basvurum().
  select cp.onay_durumu::text into v_status
    from public.coach_profiles cp
   where cp.user_id = v_user_id;

  if found then
    if v_status not in ('beklemede', 'reddedildi', 'onaylandi') then
      raise exception 'Koç başvuru durumu geçersiz';
    end if;
    update public.coach_profiles
       set seviye = p_seviye,
           elo = p_elo,
           elo_kanit = v_elo_kanit,
           fiyat = p_fiyat,
           yil = p_yil,
           tsf_belgeli = coalesce(p_tsf_belgeli, false),
           onay_durumu = case when v_status = 'onaylandi' then 'onaylandi' else 'beklemede' end,
           ret_gerekce = null
     where user_id = v_user_id
     returning user_id into v_user_id;
    v_status := case when v_status = 'onaylandi' then 'onaylandi' else 'beklemede' end;
  else
    insert into public.coach_profiles (
      user_id, seviye, elo, elo_kanit, fiyat, yil, tsf_belgeli, onay_durumu
    ) values (
      v_user_id, p_seviye, p_elo, v_elo_kanit, p_fiyat, p_yil,
      coalesce(p_tsf_belgeli, false), 'beklemede'
    )
    on conflict (user_id) do nothing
    returning user_id into v_user_id;

    -- A simultaneous submit may have inserted the row first.
    if not found then
      select cp.onay_durumu::text into v_status
        from public.coach_profiles cp
       where cp.user_id = (select auth.uid());
      update public.coach_profiles
         set seviye = p_seviye,
             elo = p_elo,
             elo_kanit = v_elo_kanit,
             fiyat = p_fiyat,
             yil = p_yil,
             tsf_belgeli = coalesce(p_tsf_belgeli, false),
             onay_durumu = case when v_status = 'onaylandi' then 'onaylandi' else 'beklemede' end,
             ret_gerekce = null
       where user_id = (select auth.uid())
       returning user_id into v_user_id;
      v_status := case when v_status = 'onaylandi' then 'onaylandi' else 'beklemede' end;
    end if;
    v_status := coalesce(v_status, 'beklemede');
  end if;

  if v_user_id is null then
    raise exception 'Başvuru kaydedilemedi';
  end if;
  return v_status;
end;
$$;

revoke all on function public.koc_basvuru_gonder(text, integer, text, integer, integer, boolean) from public, anon;
grant execute on function public.koc_basvuru_gonder(text, integer, text, integer, integer, boolean) to authenticated;
