# Arsip: setup Supabase tidak lagi digunakan

**Status: digantikan Firebase.** Jangan mengikuti petunjuk di dokumen ini untuk Anshel Code Market. Panduan terbaru adalah [Firebase Setup](./firebase-setup.md).

Proyek Supabase khusus marketplace sebelumnya belum aktif, sehingga tidak ada data pesanan atau produk dari Supabase yang perlu dimigrasi. File ini disimpan sebagai catatan keputusan teknis lama, **bukan instruksi implementasi**.

---

# Mengaktifkan Supabase — Anshel Code Market

## Status
Dashboard admin, skema SQL, dan pembaca produk terbit sudah disiapkan di GitHub. **Tidak ada proyek Supabase marketplace baru yang telah dibuat atau dikonfigurasi.** Jangan menggunakan database `anshel-virtual` atau `SepiPorto` agar data terisolasi.

Akun Supabase yang terhubung memiliki satu organisasi yang terlihat: **Sepidika's Org**. Pembuatan proyek terpisah membutuhkan pilihan organisasi dan persetujuan biaya jika ada. Jangan membuat proyek berbayar tanpa persetujuan pemilik.

## 1. Buat proyek Supabase khusus marketplace
- Nama yang disarankan: `anshel-code-market`.
- Region yang disarankan untuk Indonesia: Singapore (`ap-southeast-1`), apabila tersedia di paket.
- Periksa biaya paket/proyek sebelum membuatnya dan pilih organisasi yang benar.

## 2. Pasang skema
Setelah proyek dibuat dan statusnya **ACTIVE_HEALTHY**, jalankan isi `supabase/schema.sql` dengan SQL Editor Supabase atau migration tool. Skema ini akan membuat:

| Objek | Fungsi | Akses |
|---|---|---|
| `market_admins` | Daftar UUID pengguna yang boleh mengelola toko | Hanya baris admin miliknya sendiri |
| `market_products` | Nama, deskripsi, harga, status, lisensi, metadata pratinjau | Publik hanya membaca `published`, admin mengelola |
| `market_assets` | Metadata ZIP privat | Admin |
| `market_orders` | Fondasi pesanan, belum digunakan frontend | Admin baca saja |
| `market_order_events` | Audit status pesanan masa depan | Admin baca saja |
| bucket `anshel-source-packages` | ZIP privat maksimum 50 MB | Admin |

Enam produk konsep yang ada saat ini dimasukkan sebagai **draft**, tidak otomatis dijual.

**Penting:** kebijakan RLS dan GRANT merupakan pengaman sesungguhnya; menyembunyikan tombol dashboard bukan proteksi data.

## 3. Buat akun administrator
1. Buka **Supabase Dashboard → Authentication → Users**, buat atau undang pengguna dengan email yang dikelola pemilik/penanggung jawab sah.
2. Pastikan metode login dan verifikasi email dikonfigurasi sesuai ketentuan Supabase. **Nonaktifkan pendaftaran publik jika dashboard hanya untuk admin**.
3. Salin UUID pengguna dari dashboard (bukan password).
4. Melalui SQL Editor Supabase yang memiliki hak istimewa, jalankan perintah berikut dengan mengganti placeholder UUID:

```sql
insert into public.market_admins (user_id)
values ('UUID-AUTH-USER-YANG-SAH')
on conflict (user_id) do nothing;
```

Hanya administrator database berwenang yang boleh menambah anggota tabel tersebut. Pengguna yang mendaftar sendiri tidak otomatis menjadi admin. Jangan menaruh email/password pengguna di SQL atau kode GitHub.

## 4. Sambungkan ke Vercel
Tambahkan dua environment variable pada proyek Vercel **anshel-code-market**:

| Variable | Nilai |
|---|---|
| `SUPABASE_PROJECT_URL` | URL proyek, contoh format `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable API key **`sb_publishable_...`**, bukan secret/service-role key |

Keduanya dibaca oleh endpoint serverless `/api/market-config`. Publishable key boleh dilihat browser; keamanan tetap dijaga dengan RLS. **Jangan** menyimpan password, service-role key atau credentials Mandiri di repo, variabel publik, atau HTML.

Setelah variabel terpasang, deploy ulang. Di `/admin.html` seharusnya muncul form login. Tanpa konfigurasi, admin menampilkan petunjuk setup, bukan data palsu.

## 5. Validasi sebelum penggunaan
- Login dengan akun nonadmin ditolak oleh verifikasi `market_admins`.
- Login admin bisa melihat **6 draft** pada database baru, mengubah judul/deskripsi/harga dan mengarsipkan.
- User anonim tidak bisa membaca draft dari Data API dan tidak bisa menulis produk.
- Unggah ZIP ke storage privat berjalan dan metadata tersimpan di `market_assets`.
- Publikasi hanya berhasil jika ada ZIP, harga final, dan ringkasan lisensi.
- Setelah published, produk muncul pada bagian **Produk dari dashboard Anshel** dan halaman `/rilis.html?slug=...`.
- Pembelian/konfirmasi transfer masih **dinonaktifkan**, termasuk untuk produk published.
- Jalankan **Supabase Security Advisors**, tinjau masalah RLS atau privilege sebelum membuka akses publik.

## 6. Yang BELUM ada
- Belum ada proyek Supabase khusus marketplace yang aktif.
- Belum ada admin pengguna yang dibuat atau diberikan role.
- Belum ada koneksi Vercel ke Supabase marketplace.
- Belum ada order API, checkout aktif, bukti transfer, mutasi bank otomatis, atau unduhan pembeli.
- Belum ada produk source code final siap dijual.

Tahap berikutnya setelah DB terhubung: verifikasi admin dan ZIP privat, kesiapan produk, baru sistem order server-side, pemeriksaan mutasi Mandiri dan unduhan terotorisasi.
