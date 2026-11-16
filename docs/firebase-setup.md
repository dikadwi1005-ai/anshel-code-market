# Firebase untuk Anshel Code Market

**Status:** kode frontend dan aturan keamanan Firebase tersedia, tetapi belum ada proyek Firebase milik marketplace yang dikonfigurasi atau diuji dengan data nyata. Data Supabase tidak dimigrasi karena proyek Supabase khusus marketplace belum pernah diaktifkan.

## Arsitektur baru

| Fitur | Penyedia | Status |
|---|---|---|
| Login admin | Firebase Authentication (Email/Password) | Kode siap, menunggu proyek dan akun |
| Draft, harga, kategori, lisensi | Cloud Firestore | Kode siap, menunggu rules dan proyek |
| Admin role | Dokumen Firestore `market_admins/{uid}` | Harus dibuat manual oleh pemilik dari Firebase Console |
| Enam konsep produk | Dapat diimpor dari dashboard sebagai **draft** | Tidak ditampilkan sebagai produk terbit |
| Produk publik terbit | Query Firestore status = published | Kode pembaca siap, **publikasi dikunci** |
| Arsip ZIP privat | Firebase Storage | **Tidak aktif**: memerlukan paket Blaze/penagihan |
| Pesanan, transfer Mandiri, download | Backend transaksi terverifikasi | **Belum aktif** |

## 1. Buat proyek Firebase khusus

1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat proyek baru, misalnya **anshel-code-market**. Gunakan akun yang berhak mengelola proyek dan mematuhi persyaratan Google.
2. Pada **Project settings → General → Your apps**, tambahkan **Web app**. Simpan empat nilai dari **firebaseConfig**: `apiKey`, `authDomain`, `projectId`, `appId`. Nilai tersebut adalah konfigurasi web **publik**, bukan kata sandi.
3. Di **Build → Firestore Database**, buat database **(default)** Standard Edition. Pilih lokasi yang sesuai. Segera pasang aturan `firebase/firestore.rules`. Jangan gunakan mode tes terbuka pada database yang dapat diakses umum.
4. Di **Build → Authentication → Sign-in method**, aktifkan **Email/Password**.
5. Di **Authentication → Settings → Authorized domains**, periksa bahwa domain website resmi `anshel-code-market.vercel.app` telah diizinkan jika metode login yang digunakan memerlukannya.
6. **Tidak perlu mengaktifkan Storage, Cloud Functions, atau billing** untuk tahap draft produk.

## 2. Pasang Firestore Security Rules

Buka **Firestore Database → Rules**, salin isi `firebase/firestore.rules`, tinjau, kemudian **Publish**.

Fungsi aturan keamanan:
- Pembaca umum hanya boleh membaca produk dengan `status == "published"` dan kueri terbatas. Namun **tidak ada pengguna browser yang dapat menerbitkan produk** sebelum ZIP privat siap.
- Akun admin boleh membuat dan memperbarui draft/arsip, tidak boleh menghapus produk atau membuat pesanan.
- `market_admins` hanya dapat dibaca oleh pengguna yang sama dengan UID-nya; **tidak ada klien web yang boleh membuat atau mengubah anggota admin**.
- `market_orders`, `market_assets`, dan `market_order_events` hanya terbaca oleh admin dan semua operasi tulis dari browser ditolak.
- Semua koleksi yang tidak terdaftar ditolak secara default.

Untuk deploy via CLI (opsional), repo juga menyediakan `firebase.json`. Pilih project yang benar lewat Firebase CLI sebelum deploy; **tidak ada project ID yang di-hardcode di repo**. Pastikan rules sudah diperiksa dan bukan pada proyek yang salah.

## 3. Buat akun administrator

1. Melalui **Firebase Console → Authentication → Users**, buat pengguna dengan email yang memang dikelola pemilik/penanggung jawab yang sah.
2. Salin **User UID** dari Firebase Authentication.
3. Di **Firestore Database → Data**, buat koleksi `market_admins`; buat dokumen dengan **Document ID persis sama dengan UID** pengguna tadi. Tambahkan field informasional `role` bertipe string berisi `admin` (otorisasi rules hanya memakai keberadaan dokumen, bukan field yang dapat diubah dari browser).
4. Jangan gunakan formulir publik untuk memberikan role admin. Simpan password secara aman dan aktifkan perlindungan akun yang tersedia.

**Perhatian:** siapa pun yang memiliki akses administratif ke Firebase Console dapat mengelola anggota admin. Hanya berikan hak akses console kepada pihak yang benar-benar dipercaya.

## 4. Sambungkan Vercel

Pada proyek Vercel **anshel-code-market**, buka **Settings → Environment Variables** dan tambahkan:

| Nama | Nilai dari Firebase Web app |
|---|---|
| `FIREBASE_API_KEY` | `firebaseConfig.apiKey` |
| `FIREBASE_AUTH_DOMAIN` | `firebaseConfig.authDomain` |
| `FIREBASE_PROJECT_ID` | `firebaseConfig.projectId` |
| `FIREBASE_APP_ID` | `firebaseConfig.appId` |

Lalu deploy ulang. Endpoint `/api/market-config` hanya mengembalikan konfigurasi web publik; izin akses data tetap ditetapkan oleh Firestore Rules.

**Jangan** menaruh service-account JSON, private key, token bank, atau password admin di Vercel public variables atau kode frontend.

## 5. Gunakan dashboard

- Buka [Dashboard Admin](https://anshel-code-market.vercel.app/admin.html).
- Masuk dengan akun Email/Password yang UID-nya sudah dicatat di koleksi `market_admins`.
- Klik **Impor 6 draft konsep** jika ingin menyalin keenam contoh katalog sebagai draft ke Firestore. Ini **tidak menjadikannya produk terbit**.
- Edit nama, slug, kategori, teknologi, deskripsi, fitur, harga, path preview internal, lisensi dan status draft/arsip.
- Gunakan **Produk** untuk pengelolaan; **Pesanan** hanya-baca dan akan kosong sampai backend transaksi dibangun.

Login tidak disimpan permanen di browser, jadi setelah refresh perlu masuk kembali. Ini desain awal dashboard privat, bukan aplikasi akun pembeli.

## 6. Tentang ZIP dan biaya Firebase Storage

Firebase Auth dan Firestore dapat dimulai pada paket **Spark**, sesuai kuota gratis yang berlaku. Namun **Cloud Storage for Firebase memerlukan paket Blaze** untuk mengakses bucket bahkan jika pemakaian dapat berada dalam kuota gratis.

Untuk menghindari penagihan tak disengaja:
- Tombol unggah ZIP, publikasi, checkout Mandiri dan download pembeli **sengaja tidak aktif**.
- Jangan mengunggah source code komersial ke direktori publik website atau dokumen Firestore.
- `firebase/storage.rules` berisi **deny-all**.
- Jika nantinya mengaktifkan Blaze, perlu persetujuan pemilik/penanggung jawab pembayaran, peninjauan batas biaya dan aturan bucket privat yang terpisah.
- Setelah penyimpanan privat benar-benar tersedia, barulah rancang verifikasi pembayaran server-side, hak akses pembeli, signed download, lisensi dan refund.

Dokumentasi resmi:
- https://firebase.google.com/docs/web/alt-setup
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/firestore/security/rules-query
- https://firebase.google.com/docs/storage/faq-and-troubleshooting
- https://firebase.google.com/pricing

**Tidak ada integrasi Firebase live yang diklaim berhasil** sampai project ID, web config, rules dan login admin terverifikasi pada proyek nyata.
