# Anshel Code Market — Next.js

Anshel Code Market adalah katalog pratinjau source code yang dibangun dengan **Next.js App Router, TypeScript, React, dan Firebase**. Halaman HTML statis telah digantikan dengan komponen React yang dapat digunakan ulang.

## Menjalankan secara lokal

Gunakan Node.js 22 atau versi yang kompatibel dengan Next.js 16.

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Jalankan `npm run build` untuk memeriksa build produksi dan TypeScript.

## Integrasi Firebase

Pada Vercel, set environment variables konfigurasi web Firebase berikut untuk proyek `anshelcode`:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`

Keempat nilai ini adalah konfigurasi aplikasi web yang dapat dibaca browser, **bukan service-account secret**. Endpoint `app/api/market-config/route.ts` menyajikan konfigurasi itu dengan `Cache-Control: no-store`.

Untuk menyiapkan keamanan database, lihat [panduan Firebase](docs/firebase-setup.md) dan [Firestore Security Rules](firebase/firestore.rules). Dashboard memeriksa akun administrator melalui koleksi `market_admins`, sedangkan pengunjung hanya membaca pratinjau publik.

## Route

| Halaman | Route Next.js |
|---|---|
| Katalog | `/` |
| Pratinjau Firestore | `/rilis?slug=...` |
| Detail konsep | `/produk?id=concept-1` |
| Dashboard Admin | `/admin` |
| Tersimpan | `/tersimpan` |
| Bandingkan | `/bandingkan?ids=concept-1,concept-2` |
| Ringkasan alur pembayaran | `/checkout?id=concept-1` |
| Tentang dan kebijakan | `/tentang`, `/kebijakan` |

Tautan lama dengan akhiran `.html` dialihkan melalui `next.config.ts`, dengan query string tetap dipertahankan.

## Kualitas visual

Aset preview berada di `public/previews/*.svg`, menggunakan komponen `PreviewImage` dengan rasio bingkai 16:10 dan `object-fit: contain`. Thumbnail checkout menggunakan batas 112×80 piksel. Desain responsif diuji pada lebar 1440, 768, 390, dan 320 piksel.

## Status keamanan transaksi

**Pembelian, pesanan aktif, konfirmasi transfer, unggah ZIP, serta pengunduhan file masih dinonaktifkan.** Status `preview` hanya berarti informasi produk tampil di katalog, bukan siap dijual. Jangan menaruh source code privat di folder `public`.

## Tes browser

Setelah instalasi Playwright + Chromium, mulai Next server lalu jalankan:

```bash
BASE_URL=http://localhost:3000 npm run test:smoke
```

GitHub Actions menjalankan build Next.js dan regresi browser pada desktop/tablet/HP.
