# Rencana pembayaran Anshel Market

## Status saat ini
- Frontend katalog menggunakan **enam produk konsep** dan harga **ilustratif**.
- `checkout.html` hanyalah pratinjau pilihan pembayaran. Tidak membuat pesanan, mengumpulkan identitas pembeli, menerima uang, atau membuka unduhan.
- **Dilarang** membuka nomor rekening, payment link aktif, atau tombol bayar pada produk konsep yang belum memiliki aset, dokumentasi, dan lisensi.
- Pendaftaran merchant dan rekening harus dilakukan oleh pihak yang memenuhi persyaratan penyedia serta ketentuan usia/izin wali.

## Keputusan awal (rencana, belum diaktifkan)
1. **Transfer rekening manual** untuk percontohan awal setelah ada produk asli: pembeli mendapatkan nomor order dari server, rekening bisnis yang diverifikasi, nominal server, dan tenggat bayar. Admin memverifikasi dana masuk dari kanal bank resmi, kemudian memenuhi pesanan.
2. **Midtrans Virtual Account** untuk checkout terintegrasi ketika akun merchant aktif dan backend siap. Penjual dapat mempertimbangkan Xendit sebagai alternatif. Biaya dan ketersediaan layanan harus diverifikasi sebelum rilis.
3. **Trakteer Shop** sebagai opsi penjualan di luar checkout Anshel jika produk original mendapat persetujuan Trakteer. Jangan membuat tautan pembayaran palsu, dan jangan menganggap transaksi Trakteer sebagai pembayaran Anshel tanpa integrasi yang sah.

## Urutan sebelum produksi
- [ ] Ganti konsep menjadi produk source code asli dengan pemeriksaan kepemilikan.
- [ ] Buat arsip file ZIP aman, pemeriksaan malware, dokumentasi, versi, dependensi, dan demo.
- [ ] Tulis lisensi yang jelas untuk tiap produk, kebijakan refund, informasi pajak/biaya, serta kontak dukungan yang sah.
- [ ] Tentukan pemilik legal akun merchant dan rekening bisnis yang sudah diverifikasi.
- [ ] Buat backend untuk stok/produk, pembeli, pesanan, pembayaran, dan pengiriman digital.
- [ ] Buat role admin dengan autentikasi kuat dan audit trail.
- [ ] Simpan harga, biaya, dan order ID di server, **bukan** mengandalkan URL atau angka dari frontend.
- [ ] Buat order berstatus `pending` dengan ID unik, timestamp, total, metode, dan masa berlaku.
- [ ] Untuk transfer manual, cocokkan transaksi di mutasi bank resmi dengan order; screenshot saja tidak cukup sebagai bukti.
- [ ] Untuk gateway, verifikasi **signature notifikasi**, status pembayaran di provider, nominal, dan ID transaksi; proses notifikasi secara idempotent.
- [ ] Jangan pernah memasukkan API key, server key, token, atau kredensial rekening ke frontend/repo publik.
- [ ] Baru setelah status pesanan benar-benar `paid` dan hak unduh sah, buat signed URL berumur pendek ke file **private**.
- [ ] Buat proses refund/sengketa dan re-delivery yang tercatat.
- [ ] Uji pembayaran **sandbox**, penolakan pembayaran, pembayaran ganda, webhook palsu, timeout, refund, dan delivery sebelum mengaktifkan produksi.

## Status pesanan yang disarankan
`pending` → `awaiting_payment` → `paid` → `delivered`

Jalur alternatif: `expired`, `cancelled`, `payment_failed`, `refunded`. Status gagal atau kedaluwarsa **tidak pernah** boleh membuka file. Pembayaran tidak boleh mengubah status pesanan hanya dari permintaan browser pembeli.

## Sumber informasi resmi yang telah ditinjau
- Midtrans pricing: https://midtrans.com/id/biaya
- Midtrans bank transfer: https://docs.midtrans.com/reference/payment-bank-transfer
- Xendit biaya: https://help.xendit.co/hc/id/articles/360039086452-Bagaimana-rincian-biaya-untuk-produk-Xendit
- Trakteer Shop: https://help.trakteer.id/help-center/articles/1/2/76/apa-itu-trakteer-shop
- Trakteer syarat: https://new.trakteer.id/terms

Catatan: sumber adalah referensi eksternal dan biaya/ketentuan dapat berubah. Ini rencana teknis, **bukan integrasi pembayaran yang aktif**.
