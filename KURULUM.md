# ASL Hub — Ortak Veri + Gerçek Admin Girişi Kurulumu

Bu güncellemeyle site artık `localStorage` yerine Vercel üzerinde barındırılan
ortak bir veritabanı (Vercel KV) kullanıyor. Yönetici şifresi de artık kodda
değil, sunucu tarafında (ortam değişkeni) tutuluyor ve doğrulanıyor.

Aşağıdaki adımları **bir kere** yapman yeterli.

## 1) Değişiklikleri GitHub'a gönder

Bu klasördeki dosyaları normal şekilde repo'na push et (git add / commit / push).
Vercel, GitHub'a bağlıysa otomatik olarak yeni bir deploy başlatacak — ama KV
bağlanana kadar site "demo verisiyle" ama **kalıcı olmayan** şekilde çalışır,
bu normal, aşağıdaki adımları tamamlayınca kalıcı hale gelir.

## 2) Vercel'de ortak veritabanını (KV) oluştur

1. Vercel Dashboard → projen → üstteki **Storage** sekmesi.
2. **Create Database** → **KV** (Upstash tabanlı, Redis uyumlu) seç.
3. Bir isim ver (örn. `asl-hub-db`) → oluştur.
4. Açılan ekranda **Connect to Project** deyip bu projeyi seç, tüm ortamları
   (Production, Preview, Development) işaretli bırak → bağla.
   - Bu adım otomatik olarak `KV_REST_API_URL`, `KV_REST_API_TOKEN` gibi ortam
     değişkenlerini projene ekler. Sen hiçbir şey kopyalamana gerek yok.

## 3) Admin şifresini ortam değişkeni olarak ekle

1. Vercel Dashboard → projen → **Settings** → **Environment Variables**.
2. Yeni değişken ekle:
   - **Key:** `ADMIN_PASSWORD`
   - **Value:** İstediğin şifre (örn. `asl2026`, ama farklı bir şey seçmen önerilir)
   - Ortamlar: Production + Preview (istersen Development de)
3. **Save**.

İsteğe bağlı ama önerilir: ayrıca `ADMIN_SESSION_SECRET` adında, rastgele
uzun bir metin (örn. bir şifre üreticiden) ekleyebilirsin — bu, giriş
oturumunun imzalanmasında kullanılır. Eklemezsen sistem otomatik olarak
`ADMIN_PASSWORD`'ü kullanır, yine çalışır.

## 4) Yeniden deploy et

Ortam değişkenlerini kaydettikten sonra Vercel'de **Deployments** sekmesinden
son deploy'un yanındaki **... → Redeploy** butonuna bas (ortam değişkenleri
sadece yeni deploy'larda devreye girer).

## Bundan sonra nasıl çalışıyor?

- **Herkes** siteye girdiğinde aynı takım/fikstür/maç/kart verisini görür —
  veri artık tarayıcıda değil, Vercel KV'de tutuluyor.
- Sadece **admin şifresini bilen** kişi `/admin` sayfasından giriş yapıp
  veri değiştirebilir. Şifre doğrulaması tamamen sunucuda (`/api/login`)
  yapılıyor, tarayıcıya hiçbir zaman gönderilmiyor.
- Ziyaretçilerin ekranı, admin bir değişiklik kaydettikten sonra otomatik
  olarak ~12 saniye içinde güncellenir (sayfayı yenilemelerine gerek yok).
- Admin oturumu 7 gün geçerli bir güvenli çerezle tutulur; "Çıkış Yap" ile
  hemen sonlandırılabilir.

## Yerelde (localhost) test etmek istersen

`npm run dev` ile sadece arayüzü (Vite) çalıştırırsın, `/api/*` uçları
çalışmaz. `/api` fonksiyonlarını da yerelde denemek istersen Vercel CLI
kullanman gerekir:

```
npm i -g vercel
vercel dev
```

Bu, hem KV bağlantısını hem de `/api` fonksiyonlarını yerelde simüle eder
(Vercel hesabınla login olman ve projeyi bağlaman istenecek).
