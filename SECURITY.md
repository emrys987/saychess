# Say Chess — Güvenlik Sertleştirme Rehberi

Bu dosya, güvenlik denetiminde bulunan açıkların **nasıl kapatıldığını** ve **senin panelde
elle yapman gerekenleri** adım adım anlatır. Kod tarafı (SQL + uygulama) hazır; sadece
aşağıdaki adımları sırayla uygulaman yeterli.

---

## 0) Ne değişti? (özet)

| Açık | Durum | Nerede kapatıldı |
|---|---|---|
| `parent_children`'a doğrudan yazma → çocuk verisi sızıntısı | ✅ kapatıldı | `supabase/migrations/20261109000000_security_hardening.sql` (§1) |
| `reviews` tablosunun herkese açık okunması (kullanıcı UUID dizini) | ✅ | aynı dosya (§2) |
| Veli kodunun denenerek bulunması (6 hane) | ✅ 10 hane + 30 dk / 10 deneme kilidi | aynı dosya (§7) |
| Rehber yazılarında moderasyon atlatma (`durum='yayinda'`) | ✅ | aynı dosya (§3) |
| Sahte "onaylı + ELO doğrulanmış" koç profili | ✅ | aynı dosya (§4) |
| Koç başvuru notunun (TSF lisans no vb.) herkese açık olması | ✅ | aynı dosya (§5) |
| Bekleyen canlı derslerin kodlarıyla listelenmesi / dersin ele geçirilmesi | ✅ | aynı dosya (§6) |
| Puan manipülasyonu (başka koça yorum yazma) | ✅ | aynı dosya (§2) |
| Rollerin veritabanında hiç kontrol edilmemesi | ✅ `has_role()` + politika güncellemeleri | aynı dosya (§0, §8) |
| Hesap/veri silme hakkı (KVKK m.7) | ✅ `hesabimi_sil()` + Profilim ekranında buton | aynı dosya (§9) |
| HTTP güvenlik başlıkları (CSP, X-Frame-Options...) | ✅ | `netlify.toml` |
| OAuth dönüşünde `#access_token=` kabulü (oturum sabitleme) | ✅ | `src/features/auth/google.ts` |
| Canlı ders kodunun `Math.random` ile üretilmesi | ✅ `expo-crypto` | `src/features/live/useLiveDers.ts` |
| `/robots.txt` olmaması | ✅ | `public/robots.txt` |

---

## 1) SQL'i veritabanına uygula (EN ÖNEMLİ ADIM)

> ⚠️ Bu adım RLS kurallarını sıkılaştırır. Önce **staging** projesinde dene; yoksa en azından
> Supabase → Database → Backups'tan bir yedek al.

1. Supabase paneline gir → projeni seç.
2. Sol menüden **SQL Editor** → **New query**.
3. `app/supabase/migrations/20261109000000_security_hardening.sql` dosyasının **tamamını**
   kopyala, editöre yapıştır.
4. **Run** (Ctrl/Cmd + Enter). Hata çıkmamalı. Çıkarsa hata satırını bana gönder.
5. Doğrula: aynı editörde şunu çalıştır, **5 satır** dönmeli:
   ```sql
   select proname from pg_proc
    where proname in ('has_role', 'live_katil', 'koc_basvurum', 'moderator_basvurular', 'hesabimi_sil');
   ```

---

## 2) Supabase → Authentication → URL Configuration

1. **Site URL** = `https://saychesse.netlify.app`
2. **Redirect URLs** listesine **tam** adresleri ekle (joker `*` kullanma):
   - `https://saychesse.netlify.app`
   - `https://saychesse.netlify.app/auth-callback`
   - `saychess://auth-callback`
   - `http://localhost:8081` (sadece geliştirme için)
   - `exp://**` (sadece Expo Go ile test ediyorsan)
3. Kaydet.

> Neden: joker adres varsa, saldırgan kendi sitesine token yönlendirebilir.

---

## 3) Supabase → Authentication → Sign In / Providers

- **Google**: açık kalsın. Google Cloud Console'da "Authorized redirect URI" olarak
  `https://yekrbatjnswrjkqwyntd.supabase.co/auth/v1/callback` yazılı olmalı.
- **Email**: çocuk hesapları için **kapat** (önerilen). Çocuklar Google ile girsin, hesabı
  veli/koç açsın. Email'i kapatınca botların e-posta ile hesap açması da tamamen biter.
  - ⚠️ **Email'i kapatmak Google girişini KAPATMAZ.** Google ayrı bir sağlayıcıdır; uygulama
    `signInWithOAuth({ provider: 'google' })` kullanıyor. Google'dan gelen kullanıcıların
    e-posta adresi `session.user.email` alanında aynen görünmeye devam eder.
  - Email kapatınca yalnızca şunlar kapanır: e-posta+şifre girişi, sihirli link/OTP,
    şifre sıfırlama e-postası. Uygulamada bunların hiçbiri kullanılmıyor.
  - Kapatmadan önce kontrol: **Authentication → Users** listesinde `provider = email` olan
    kullanıcı var mı? Varsa onlar e-posta ile giriş yapamaz hale gelir (uygulamada e-posta
    girişi yok, o yüzden normalde sorun olmaz).
- **Anonymous sign-ins**: kapalı olsun (şu an kapalı ✓).
- **Allow new users to sign up**: Email'i kapatacaksan bu ayar etkisiz kalır; Google ile
  yeni kullanıcı gelmeye devam eder.

---

## 4) Supabase → Authentication → Sessions (oturum güvenliği)

Bu ayarlar **Authentication → Sessions** altında. (Ekranında yoksa: **Project Settings → API →
JWT Settings**.)

| Ayar | Değer | Ne işe yarar |
|---|---|---|
| **Access token (JWT) expiry limit** | `3600` (1 saat) | Çalınan token en fazla 1 saat geçerli olur. Varsayılan da 3600'dür. |
| **Refresh token rotation** | AÇIK | Her yenilemede refresh token değişir; eskisi geçersiz olur. |
| **Reuse interval** | `10` saniye | Aynı refresh token 10 sn içinde tekrar kullanılabilir (yavaş internet toleransı). Büyütme. |
| **Time-box user sessions** | Şimdilik KAPALI | Belirli süre sonra zorunlu çıkış. Çocuk uygulamasında gereksiz sürtünme. |
| **Inactivity timeout** | Şimdilik KAPALI (istersen 30 gün) | Hareketsizlik sonrası çıkış. |

> Uygulama `autoRefreshToken: true` ile çalışıyor (`src/lib/supabase.ts`), yani 1 saatlik
> token sessizce yenilenir; kullanıcı fark etmez.

---

## 4b) Supabase → Authentication → Attack Protection (CAPTCHA + sızmış şifre)

Supabase panelindeki **Settings → Authentication → Bot and Abuse Protection** ekranı:

1. **Enable Captcha protection** — e-posta/şifre uç noktalarına bot koruması ekler.
   - **Email provider'ı kapattıysan buna GEREK YOK** (e-posta ile kayıt zaten mümkün değil).
   - Açacaksan: provider = **Turnstile by Cloudflare**, `Captcha secret` alanına
     Cloudflare'in **Secret Key**'i yapıştır. Boş bırakırsan **Save changes** hata verir.
2. **Configure in email provider** — sadece bir kısayol; tıklarsan Email provider ayarlarına
   gider. CAPTCHA ile ilgili doldurulacak bir alan değil.
3. **Prevent use of leaked passwords** — HaveIBeenPwned listesindeki şifreleri reddeder.
   - Yalnızca **şifre ile giriş** varsa işe yarar (bizde yok).
   - **Pro plan ve üstü** gerekir; ücretsiz planda açmaya çalışırsan hata verir → atla.

### Turnstile kurulumu (CAPTCHA'yı açacaksan, 5 dakika)

1. <https://dash.cloudflare.com> → sol menü **Turnstile** → **Add widget**.
2. Widget name: `Say Chess` · Hostnames: `saychesse.netlify.app`
   (geliştirme için `localhost` de ekleyebilirsin).
3. Widget Mode: **Managed** → **Create**.
4. Çıkan iki anahtardan **Secret Key**'i kopyala (Site Key'i şimdi kullanmıyoruz).
5. Supabase → Attack Protection → **Enable Captcha protection** AÇIK →
   provider **Turnstile** → **Captcha secret** alanına yapıştır → **Save changes**.

> ⚠️ Önemli: CAPTCHA sunucu tarafında çalışır, Google ile girişi **bozmaz**.
> Ama ileride uygulamaya e-posta/şifre girişi eklersen, istemci `captchaToken` göndermek
> zorundadır (`options: { captchaToken }`) — yoksa o girişler `captcha_failed` döner.


---

## 5) Moderatör hesabını güvene al

1. Moderatör rolünü **sadece** SQL Editor'den ver (uygulamada seçilemiyor ✓):
   ```sql
   update public.profiles set rol = 'moderator' where id = '<moderatör-uuid>';
   ```
2. Moderatör hesabında **MFA (TOTP)** aç: Authentication → Users → kullanıcı → Multi Factor.
3. Moderatör için ayrı bir e-posta kullan.

---

## 6) Demo koçları canlıdan kaldır

```sql
-- Önce kontrol et
select id, email from auth.users where email like 'demo.koc%@saychess.local';
-- Sonra sil (bağlı profil/randevular cascade ile gider)
delete from auth.users where email like 'demo.koc%@saychess.local';
```

---

## 7) Netlify'a yeni sürümü çıkar

1. `netlify.toml` güncellendi (CSP + X-Frame-Options + Referrer-Policy + nosniff + Permissions-Policy).
2. Commit + push → Netlify otomatik deploy eder.
3. Başlıkları doğrula:
   ```bash
   curl -sSI https://saychesse.netlify.app/ | grep -Ei 'content-security-policy|x-frame-options|referrer-policy|x-content-type-options|permissions-policy'
   ```
   5 başlığın **hepsi** görünmeli.

> CSP bir şeyi bozarsa (ör. Google girişi): tarayıcı konsolunda "Refused to ..." satırını bul,
> bana gönder; `connect-src` / `img-src` listesine ekleyelim.

---

## 8) Uygulamayı 4 rolle test et (10 dakikalık kontrol listesi)

**Öğrenci hesabı**
- [ ] Profilim → "Kod üret" → **10 haneli** veli kodu geliyor.
- [ ] Ders Odası → maç oyna → Ödev → "Son maçı analiz et" → ödev ekleniyor.
- [ ] Canlı Ders → "Ders oluştur" → 6 haneli kod çıkıyor.

**Veli hesabı**
- [ ] Veli Paneli → 10 haneli kodu gir → "Bağlandı: <çocuk adı>".
- [ ] Yanlış kodu 11 kez gir → "Kod bulunamadı..." (kilit çalışıyor).
- [ ] Takvim → "Puanla" butonu **görünmüyor** (artık sadece öğrenci puanlar).

**Koç hesabı**
- [ ] Profilim → Koç bilgileri doldur → Kaydet → "Başvurunuz İnceleniyor".
- [ ] Rehber → yazı gönder → yazı **hemen yayında görünmüyor** ✅
- [ ] Koç Bul'da kendi profilin **görünmüyor** (onay bekliyor).

**Moderatör hesabı**
- [ ] Yönetim paneli → başvuru **notu / lisans no görünüyor** (sadece burada).
- [ ] Onayla → koç Koç Bul'da görünüyor.
- [ ] Rehber → "Onay bekleyenler" → yayınla.

**Sızıntı / KVKK testi**
- [ ] Profilim → "Hesabımı sil" → "Evet" → hesap siliniyor ve çıkış yapılıyor.

---

## 9) Doğrulama komutları (kopyala-yapıştır)

```bash
K='sb_publishable_zxCmi-eLE8h9a9AhJE2SkA_IwIJsZiT'
U='https://yekrbatjnswrjkqwyntd.supabase.co'

# 1) Anon erişim kapalı mı? Hepsi 401 dönmeli.
for t in profiles reviews posts parent_children coach_profiles live_sessions; do
  printf '%-18s ' "$t"; curl -s -o /dev/null -w '%{http_code}\n' "$U/rest/v1/$t?select=id&limit=1" -H "apikey: $K"
done

# 2) Yeni RPC'ler anon'a kapalı mı? 401 dönmeli.
curl -s -o /dev/null -w 'live_katil   %{http_code}\n' -X POST "$U/rest/v1/rpc/live_katil" \
  -H "apikey: $K" -H 'Content-Type: application/json' -d '{"p_kod":"AAAAAA"}'
curl -s -o /dev/null -w 'hesabimi_sil %{http_code}\n' -X POST "$U/rest/v1/rpc/hesabimi_sil" \
  -H "apikey: $K" -H 'Content-Type: application/json' -d '{}'

# 3) Güvenlik başlıkları
curl -sSI https://saychesse.netlify.app/ | grep -Ei 'strict-transport|content-security|x-frame|referrer|x-content-type|permissions'
```

---

## 10) KVKK / COPPA / GDPR-K (hukuk + ürün işi, kod yetmez)

1. **Yaş kapısı**: İlk girişte "13 yaşından küçük müsün?" sorusu; küçükse **veli onayı** akışı.
2. **Aydınlatma + açık rıza metni**: Giriş ekranında link; hangi veri (ad, maç, ödev),
   neden (eğitim takibi), ne kadar süre saklanıyor.
3. **Veri minimizasyonu**: Mümkünse takma ad; `foto_url` için serbest URL yerine Supabase Storage.
4. **Saklama süresi**: Ör. 12 ay sonra maç/ödev kayıtlarını otomatik sil (cron + SQL).
5. **Moderatör erişim kaydı**: Çocuk verisine kimin baktığını logla (`audit_log` tablosu).
6. **Yorum moderasyonu**: `reviews.yorum` için kelime filtresi + şikayet butonu.

---

## Geri alma (bir şey bozulursa)

En hızlı geri dönüş: Supabase → **Database → Backups** → son yedeği geri yükle.
Alternatif: `20261109000000_security_hardening.sql` içindeki `create policy` bloklarını eski
hâline çevirmek gerekir; bunu istersen ben yaparım.

---

## Kullanıcıya söylenmesi gereken davranış değişiklikleri

- Veli kodu **6 → 10 hane**. Eski kodlar hâlâ çalışır, yeni üretilenler 10 haneli.
- Veli artık ders **puanlayamaz** (yalnızca öğrenci puanlar).
- Rehber yazısını yalnızca **koç** rolü gönderebilir.
- "Profilim" ekranına **Hesabımı sil** geldi.
