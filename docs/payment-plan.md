# Pembayaran Anshel Market — Rencana rilis transfer Mandiri

## Keputusan (16 November 2026)
- **Metode utama:** transfer rekening **Bank Mandiri langsung**. Proses pemesanan dan status tetap ada di website Anshel.
- **SeaBank:** tidak ditampilkan sebagai pilihan checkout selama belum diperlukan dan belum dikonfigurasi.
- **Trakteer, Midtrans, Xendit:** tidak digunakan dalam checkout awal. Bisa ditinjau kembali di masa depan jika ada kebutuhan bisnis.
- **Status saat ini:** checkout adalah **pratinjau non-transaksional**. Semua listing masih konsep dan harga ilustratif. Tidak ada pesanan, rekening yang diumumkan, konfirmasi pembayaran atau unduhan aktif.
- Pemilik akun/rekening dan izin penggunaan bisnis harus memenuhi syarat bank dan hukum yang berlaku; apabila memerlukan persetujuan orang tua/wali, pengaturan tersebut dilakukan melalui kanal resmi.

## Yang sudah diimplementasikan
- `checkout.html` adalah halaman Mandiri-only responsif. Untuk setiap produk konsep tersedia ringkasan, status belum aktif dan alur transfer.
- `checkout.css` menyediakan layout desktop dua kolom dan mobile satu kolom.
- Data rekening **tidak ditebak, di-hardcode, atau diminta melalui browser**. Kolom nomor rekening dan atas nama jelas berstatus belum dikonfigurasi.
- Tombol `Pesanan belum tersedia` **disabled**; tidak ada API order, database, formulir pembeli, invoice, nomor pembayaran, atau file yang dapat diunduh.
- Halaman detail produk terhubung ke `/checkout.html?id=N`.

## Syarat membuka pembayaran
1. Ganti listing konsep menjadi source code asli yang sah dijual; periksa kepemilikan, dokumentasi, dependensi, README, demo, dan isi ZIP.
2. Tentukan lisensi, kebijakan refund, kebijakan data pribadi, kontak dukungan, harga final dan biaya transfer yang mungkin dikenakan bank pengirim.
3. Verifikasi pemilik rekening Mandiri dan kepatuhan penggunaan bisnis melalui kanal bank yang resmi. Nama dan rekening penerima baru diumumkan **pada checkout order yang sah**, bukan di repository sebagai placeholder.
4. Gunakan backend dengan autentikasi admin dan database permanen untuk produk, order, pembayaran, log audit, dan hak unduhan.
5. Backend wajib menghitung nominal/produk dari data terpercaya; **abaikan harga, status, dan identitas yang dikirim frontend**.
6. Buat order acak unik yang tahan pengulangan dan simpan `order_id`, `product_id`, `price_snapshot`, `pending_at`, `expires_at`, `payment_state`, `delivery_state`. Order baru tidak bisa dibayar jika produk tidak aktif.
7. Setelah order dibuat, tampilkan nomor dan nama rekening penerima **yang sudah diverifikasi**, nominal server, nomor order, batas waktu, dan instruksi transfer.
8. Konfirmasi awal pembeli (jika tersedia) hanya membuat tanda **menunggu verifikasi**, tidak boleh mengubah `payment_state` ke `paid`.
9. Admin memeriksa **mutasi rekening bank resmi**, nilai, waktu, dan referensi sebelum mengonfirmasi pembayaran. Screenshot atau pesan chat bukan bukti lunas.
10. Proses konfirmasi harus idempotent dan tercatat, memerlukan admin terautentikasi dan mencegah satu mutasi dipakai untuk melunasi beberapa order.
11. Setelah status lunas benar, buat hak unduhan terikat identitas/order; file disimpan privat dan hanya diberikan melalui URL bertanda tangan berjangka waktu.
12. Uji pesanan gagal, duplikat, kedaluwarsa, palsu, tanpa izin, dan refund sebelum mengaktifkan pembayaran produksi.

## Status order yang diperbolehkan
- `pending` → `awaiting_payment` → `payment_review` → `paid` → `delivered`.
- Jalur alternatif `expired`, `cancelled`, `rejected`, `refunded`.
- Tidak ada perubahan status `paid` / `delivered` dari input browser pembeli.

## Kesiapan sebelum rilis
- [ ] Produk asli dan dokumen lisensi siap.
- [ ] Rekening penerima Mandiri dan pemiliknya diverifikasi sesuai ketentuan.
- [ ] Backend dan database dengan kontrol akses admin.
- [ ] Admin bisa memeriksa mutasi dan audit pesanan.
- [ ] Pembeli bisa melihat status pesanan dengan autentikasi yang aman.
- [ ] File pribadi, signed URL, dan pengiriman digital tersedia.
- [ ] Penanganan refund dan dukungan pelanggan tersedia.
- [ ] Integrasi diuji lengkap dan ditinjau sebelum sakelar penerimaan order diaktifkan.

**Penting:** GitHub dan HTML publik tidak digunakan untuk menyimpan kredensial bank, password perbankan, API key, atau detail pribadi penerima yang belum perlu diumumkan. Ini catatan implementasi, bukan sistem pembayaran aktif.
