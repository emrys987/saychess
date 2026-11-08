# Say Chess ♟️

Çocuklar ve gençler için koç destekli, interaktif satranç eğitimi ve gelişim takip platformu.  
**Expo (React Native) + TypeScript + Supabase** mimarisiyle tek kod tabanından **iOS, Android ve Web** desteği sunar.

---

## 🎯 Proje Hakkında

Say Chess; satranç öğrenen çocukları, eğitmenleri (koçları) ve velileri tek bir çatı altında buluşturan modern bir mobil ve web uygulamasıdır. Klasik satranç platformlarından farklı olarak; maç analizlerinden otomatik ödev üretimi, canlı birebir ders senkronizasyonu ve veli takip mekanizmaları barındırır.

### ✨ Temel Özellikler

* **♟️ Ders Odası & Oyun Modları:** 
  * `chess.js` tabanlı tahta motoru, yasal hamle denetimi ve süre kontrolü (5+3).
  * Çevrimdışı/bota karşı pratik yapma imkânı.
* **⚡ Canlı Ders (Realtime Eşzamanlama):**
  * Supabase Realtime ile 6 haneli davet kodu üzerinden koç ve öğrenci arasında anlık hamle senkronizasyonu.
* **🧩 Akıllı Ödev & Bulmaca Sistemi:**
  * Oynanan maçların motor analiziyle hatalı pozisyonlardan otomatik ödev ve taktik bulmaca üretimi.
  * Tematik bulmaca setleri (Tek hamlede mat, çatal, açmaz vb.).
* **👨‍🏫 Koç Bul & Randevu Yönetimi:**
  * Onaylı koç profilleri, filtreleme, müsaitlik saatleri ve randevu takvimi.
  * Ders sonu puanlama ve koç değerlendirme sistemi.
* **👨‍👩‍👧 Veli Paneli:**
  * Veli kodu ile öğrenci hesabını eşleyerek ders katılımı, maç performansı ve ödev tamamlama istatistiklerini takip etme.
* **📚 Satranç Rehberi & Moderasyon:**
  * Koçların ve moderatörlerin eğitici yazılar yayınlayabildiği dinamik içerik platformu.
* **🔐 Rol Tabanlı Güvenlik (RBAC):**
  * Supabase Auth (Google OAuth & E-posta) entegrasyonu, PostgreSQL Row Level Security (RLS) ile korunan veritabanı.

---

## 🛠️ Teknoloji Yığını

* **Frontend:** [React Native](https://reactnative.dev/) (0.88), [Expo](https://expo.dev/) (SDK 58), [Expo Router](https://docs.expo.dev/router/introduction/)
* **Dil:** [TypeScript](https://www.typescriptlang.org/) (Strict mode)
* **Satranç Motoru / Mantığı:** [chess.js](https://github.com/jhlywa/chess.js)
* **Backend & Veritabanı:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime, Row Level Security)
* **Web Desteği:** `react-native-web` (Mobil ile %100 paylaşılan UI bileşenleri)

---

## 📂 Dizin Yapısı

```text
src/
├── app/                 # Expo Router dosya tabanlı navigasyon
│   ├── _layout.tsx      # Global oturum & rol korumalı rotalar
│   ├── login.tsx        # Giriş & kimlik doğrulama ekranı
│   ├── rol-sec.tsx      # İlk giriş rol seçimi (Koç, Öğrenci, Veli)
│   └── (tabs)/          # Ana sekme rotaları (Oda, Ödev, Canlı, Koç, Veli...)
├── components/          # Paylaşılan UI bileşenleri (Button, Card, Modal vb.)
├── features/            # İş mantığı ve modüller
│   ├── auth/            # AuthProvider, Google OAuth, rol yönetimi
│   ├── booking/         # Randevu ve takvim mantığı
│   ├── homework/        # Ödev analizi ve bulmaca çözücü
│   ├── lesson/          # Satranç tahtası kancaları ve motor entegrasyonu
│   └── live/            # Realtime ders senkronizasyonu
├── lib/                 # Supabase istemcisi ve harici servis yapılandırmaları
├── theme/               # Tasarım sistemi, renk paletleri ve tipografi
└── types/               # Veritabanı ve genel TypeScript tipleri
supabase/
├── migrations/          # PostgreSQL şemaları, tetikleyiciler ve RLS kuralları
└── demo/                # Test ve geliştirme için örnek SQL verileri
```

---

## 🚀 Başlangıç ve Kurulum

### Gereksinimler

* [Node.js](https://nodejs.org/) (v18 veya üzeri önerilir)
* [npm](https://www.npmjs.com/) veya [bun](https://bun.sh/)
* Test için [Expo Go](https://expo.dev/go) mobil uygulaması (iOS / Android)

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

> **Not:** Yeni bir paket eklerken uyumlu Expo SDK sürümünü garanti etmek için `npx expo install <paket-adi>` komutunu kullanın.

### 2. Çevre Değişkenlerini Tanımlayın

`.env.example` dosyasını referans alarak `.env.local` oluşturun:

```bash
cp .env.example .env.local
```

`.env.local` dosyasını Supabase API bilgilerinizle doldurun:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-publishable-key
```

### 3. Uygulamayı Başlatın

```bash
# Web tarayıcısında çalıştırmak için:
npm run web

# Expo geliştirici sunucusunu başlatmak için (Terminaldeki QR kod ile Expo Go):
npm start

# Android / iOS simülatöründe çalıştırmak için:
npm run android
npm run ios
```

---

## 🗄️ Veritabanı & Supabase Kurulumu

1. [Supabase](https://supabase.com/) üzerinde yeni bir proje oluşturun.
2. **SQL Editor** bölümüne giderek `supabase/migrations/` altındaki SQL dosyalarını sırayla çalıştırın.
3. Proje ayarlarından **Project Settings → API** sekmesindeki URL ve Anon Key değerlerini `.env.local` dosyanıza kopyalayın.
4. **Google ile Giriş (OAuth)** için:
   * Google Cloud Console üzerinden OAuth Web Client oluşturup Supabase Auth paneline tanımlayın.
   * Supabase Redirect URLs listesine geliştirme adreslerini ekleyin:
     * `http://localhost:8081` (Web)
     * `saychess://**` (Derleme / Production)
     * `exp://**` (Expo Go)
5. *(İsteğe Bağlı)* Geliştirme aşamasında listeleme ve randevu akışlarını test etmek için `supabase/demo/demo_koclar.sql` dosyasını SQL Editor'da çalıştırarak örnek koç profilleri yükleyebilirsiniz.

---

## 🧪 Kod Kalitesi ve Test

PR açmadan veya yayına almadan önce aşağıdaki kontrolleri çalıştırabilirsiniz:

```bash
# TypeScript tip kontrolü
npm run typecheck

# Linter kontrolü
npm run lint

# Expo bağımlılık uyumluluk kontrolü
npx expo doctor
```

---

## 🌐 Yayınlama (Build & Deployment)

### Web (SPA)
Uygulama statik web paketi olarak dışa aktarılabilir:
```bash
npx expo export --platform web
```
Oluşan `dist/` klasörü [Vercel](https://vercel.com) veya [Netlify](https://netlify.com) üzerine dağıtılabilir. (`public/_redirects` ve `vercel.json` SPA yönlendirmeleri için hazır yapılandırılmıştır.)

### Mobil (iOS & Android)
Expo Application Services (EAS) kullanarak bulutta build alınabilir:
```bash
# Android APK önizleme paketi için:
npx eas-cli build -p android --profile preview

# Production mağaza derlemesi için:
npx eas-cli build --platform all
```

---

## 🔧 Sık Karşılaşılan Sorunlar (Troubleshooting)

| Belirti | Olası Neden / Çözüm |
|---|---|
| **Tablo veya kolon bulunamadı hatası** | Veritabanı migration'ları eksik çalıştırılmış. `supabase/migrations/*.sql` sırasını kontrol edin. |
| **Google girişinde `redirect_uri_mismatch`** | Google Cloud Console'daki Redirect URI ile Supabase Auth callback adresi eşleşmiyor. |
| **Canlı derste hamleler eşzamanlanmıyor** | `live_moves` tablosunun Supabase Realtime yayınına eklendiğinden emin olun (`alter publication supabase_realtime add table public.live_moves;`). |
| **Randevuda "Bu saat dolu" uyarısı** | Seçilen saat diliminde koçun mevcut randevusu var (çakışma kısıtı çalışıyor). |

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır.
