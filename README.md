# Say Chess

Çocuklar için koçlu satranç uygulaması. **Expo (React Native) + TypeScript + Supabase**, tek kod tabanından iOS, Android ve web.

> `index-3.html` eski HTML/JS demodur. Özellikler TypeScript'e taşınana kadar referans olarak duruyor; taşıma bitince silinecek.
> Görsel dil (renkler, serif başlıklar, mono sayaçlar, pill butonlar, `phead` lekeli başlık, siyah giriş sahnesi) bu dosyadan birebir taşınıyor: `src/theme` + `src/components/ui.tsx`.

## Kurulum

```bash
npm install
cp .env.example .env.local   # Supabase URL + publishable key'i doldurun
npm run web                  # tarayıcıda
npm start                    # QR kod ile telefonda (Expo Go)
```

Kontroller (PR açmadan önce):

```bash
npm run typecheck
npm run lint
npx expo-doctor
```

Paket eklerken `npm install` yerine **`npx expo install <paket>`** kullanın (SDK ile uyumlu sürümü seçer).

## Supabase (ücretsiz plan)

1. https://supabase.com → yeni proje (bölge: Avrupa).
2. **SQL Editor** → `supabase/migrations/` altındaki dosyaları sırayla çalıştırın.
3. **Project Settings → API** → URL ve *publishable* key'i `.env.local`'e yazın.
   `service_role` / secret key asla uygulamaya girmez.
4. Ücretsiz projeler 7 gün kullanılmazsa duraklatılır, sunumdan önce kontrol edin.

## Demo verisi

Gerçek koç hesabı açmadan Koç Bul / randevu akışını denemek için:

`supabase/demo/demo_koclar.sql` → Supabase SQL Editor'da çalıştırın.
3 hayali koç ekler (Elif / Mert / Zeynep). Bu hesapların şifresi yok, **giriş yapamazlar**;
sadece listede görünüp randevu alınabilirler. Dosyanın sonundaki `delete` satırı hepsini temizler.

Moderatör rolü elle verilir (SQL Editor):

```sql
update public.profiles set rol = 'moderator' where id = '<kullanici-uuid>';
```

## Google ile giriş

1. **Google Cloud Console → APIs & Services → Credentials** → *OAuth client ID* → tip **Web application**.
   *Authorized redirect URIs*: `https://<proje-ref>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Sign In / Providers → Google**: Client ID + Client Secret'ı girip etkinleştirin.
3. **Supabase → Authentication → URL Configuration → Redirect URLs** listesine ekleyin:
   - `http://localhost:8081` (web geliştirme)
   - `saychess://**` (mobil build)
   - `exp://**` (Expo Go ile geliştirme)

Akış: Google girişi → `profiles` satırı trigger ile otomatik oluşur → ilk girişte **rol seçimi** (koç / öğrenci / veli, bir kez seçilir) → sekmeler.

## Sunum akışı (demo)

Tek hesapla gösterilebilecek sıra:

1. **Giriş** → Google → ilk girişte rol seç (koç / öğrenci / veli).
2. **Ders Odası** → "Maça başla (5+3)" → birkaç hamle → "Teslim ol" → maç "Son maçlarım"a düşer.
3. **Ödev** → "Son maçı analiz et" → motor hataları bulur, ödev üretir → "Çöz" → tahtada doğru hamle → "çözüldü".
4. **Ödev → Tema seti ekle** → "Tek hamlede mat" → 3 hazır puzzle.
5. **Canlı Ders** → "Ders oluştur" → 6 haneli kod → ikinci pencerede kodu gir → hamleler iki cihazda senkron.
6. **Koç Bul** → demo koçlardan biri → "Randevu" → saat seç.
7. **Takvim** → randevuyu gör → "Puanla" → 5 yıldız → **Koç Bul**'da koçun puanı güncellenir.
8. **Rehber** → koç olarak yazı gönder → (moderatör rolüyle) onayla → "Yayında".
9. **Veli Paneli** → öğrencinin veli kodunu gir → çocuğun ödev/maç/ders özeti.

## Yayınlama (hosting)

Uygulama **web** olarak tek klasöre çıkar: `npx expo export --platform web` → `dist/`.
İçindeki `index.html` tek sayfa (SPA) olduğu için host tarafında "her yolu index.html'e çevir" kuralı gerekir;
`public/_redirects` (Netlify) ve `vercel.json` (Vercel) bu kuralı hazır içeriyor.

### 1) Web'e koy (link ile göstermek için en kolayı)
```bash
npx expo export --platform web
```
- **Netlify**: `dist` klasörünü https://app.netlify.com/drop adresine sürükle-bırak. Bitti.
- **Vercel**: `npx vercel` (ya da panelden "Import Git Repository").
- **EAS Hosting**: `npx eas-cli deploy` (Expo hesabı ister).

Sonra Supabase → **Authentication → URL Configuration** ve Google Cloud → **Authorized JavaScript origins**
listesine yeni adresi (ör. `https://saychess.netlify.app`) ekle, yoksa Google girişi çalışmaz.

### 2) Telefonda göster (uygulama mağazası olmadan)
```bash
npx expo start --tunnel
```
QR kodu Expo Go ile okutan herkes uygulamayı açar (farklı ağdan da çalışır).
Supabase → Redirect URLs içinde `exp://**` kayıtlı olmalı.

Android APK (kurulabilir dosya) istiyorsan: `npx eas-cli build -p android --profile preview`
→ EAS sana indirilebilir bir APK linki verir. iOS için TestFlight/Apple Developer hesabı gerekir.

### 3) Kodu teslim et (GitHub)
```bash
git init            # bu klasörde repo yoksa
git add .
git commit -m "Say Chess: Expo + TypeScript + Supabase"
git remote add origin https://github.com/<kullanici>/<repo>.git
git push -u origin main
```
`.env.local` **git'e girmez** (`.gitignore`'da). Karşı taraf `.env.example`'ı kopyalayıp kendi anahtarlarını girer.
`service_role` / secret anahtarı asla repoya koymayın.



## Sorun giderme

| Belirti | Olası neden / çözüm |
|---|---|
| "Gerekli tablo yok" | Migration'lar çalıştırılmamış. `supabase/migrations/*.sql` dosyalarını sırayla çalıştırın. |
| Google girişinde "redirect_uri_mismatch" | Google Cloud'da yönlendirme adresi `https://<ref>.supabase.co/auth/v1/callback` olmalı. |
| Giriş sonrası boş ekran | Supabase → Authentication → URL Configuration'da `http://localhost:8081` ekli mi? |
| Canlı derste hamle karşıya gitmiyor | `live_moves` tablosu Realtime yayınında mı? (`alter publication supabase_realtime add table public.live_moves;`) |
| Randevu "Bu saat dolu" | Aynı koç/saat için `unique` kısıtı çalışıyor (beklenen davranış). |
| Analiz çok yavaş | Derinlik 2; uzun maçlarda birkaç saniye normaldir. |
| Supabase projesi uyuyor | Ücretsiz plan 7 gün hareketsizlikte duraklatır; panelden "Restore" yapın. |



```
src/
  app/                 # Expo Router: her dosya bir ekran
    _layout.tsx        # oturum/rol durumuna göre korumalı rotalar
    login.tsx
    rol-sec.tsx
    (tabs)/            # giriş yapmış ve rol seçmiş kullanıcı
  components/          # ortak UI (Button, Card)
  features/auth/       # AuthProvider, Google girişi, roller
  lib/supabase.ts      # Supabase client
  theme/               # renkler (index-3.html paleti)
  types/database.ts    # DB tipleri (supabase gen types ile yenilenecek)
supabase/migrations/   # şema + RLS (SQL)
```

## Yol haritası

| Faz | İçerik | Durum |
|---|---|---|
| 0 | Expo Router + TS iskeleti, Supabase client, lint/typecheck | ✅ |
| 1 | Google giriş, rol seçimi, profil (`profiles` + RLS) | ✅ temel (fotoğraf yükleme / koç detayları eksik) |
| 2 | Tahta bileşeni (`chess.js`), 5+3 maç, maçların `games` tablosuna kaydı | ✅ (maç analizi Faz 3'te) |
| 3 | Ödev: tema setleri, maç analizinden otomatik ödev, tahtada çözme | ✅ (Lichess/PGN import eksik) |
| 4 | Koç Bul (filtreler), koç profili, müsaitlik, randevu | ✅ (ödeme yok) |
| 5 | Canlı ders: Realtime hamle senkronu (davet kodlu oturum) | ✅ (ses/görüntü yok) |
| 6 | Ders sonu puanlama, koç–öğrenci bağı, Veli Paneli, Satranç Rehberi + moderasyon | ✅ |
| 7 | Paketler vitrini (fiyatlar + kapsam dışı etiketi) | 🎨 tasarım · ödeme yok |
