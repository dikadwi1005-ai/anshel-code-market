# Rilis pembayaran QRIS

Checkout dinonaktifkan secara default. Di lingkungan Sandbox, set MARKET_CHECKOUT_ENABLED=true, SUMOPOD_MODE=sandbox, SUMOPOD_API_KEY, SUMOPOD_SIGNING_SECRET, dan kredensial server Firebase untuk anshelcode. SDK menggunakan Application Default Credentials atau COMMERCE_SERVICE_ACCOUNT berisi JSON akun layanan yang disimpan sebagai rahasia server. Jangan simpan nilai rahasia di Git.

Aktifkan Google Sign-In pada Firebase Auth dan daftarkan domain aplikasi. Di SumoPod, arahkan webhook ke /api/sumopod/webhook. Pisahkan kredensial dan data transaksi Sandbox dari Live. Uji dengan proyek atau lingkungan data terisolasi.

Hanya produk Firestore berstatus preview atau published yang memiliki dokumen market_sale_offers dengan ID sama dan active=true yang bisa dibeli. Gunakan produk yang disetujui dan memiliki file siap kirim. Harga diambil dari Firestore saat pesanan dibuat.

Pembeli kembali ke halaman akun setelah checkout. Status lunas hanya ditulis melalui webhook bertanda tangan yang cocok dengan pesanan. Admin melihat pesanan lunas dan email pembeli di tab Pesanan untuk mengirim file secara manual. Setelah pengiriman, status fulfillment perlu diperbarui melalui proses admin yang dikendalikan agar file tidak dikirim dua kali. Halaman akun belum menampilkan riwayat pesanan.

Sebelum membuka Live, verifikasi pembuatan link, satu pembayaran Sandbox end-to-end, pengiriman webhook ulang, email penerima, visibilitas produk, dan perilaku ketika provider mengembalikan error atau timeout.

## Email otomatis

Simpan `RESEND_API_KEY` sebagai rahasia server dan `MARKET_EMAIL_FROM` sebagai pengirim dari domain terverifikasi. Aktifkan melalui `MARKET_EMAIL_ENABLED=true` setelah uji Sandbox. Hanya pesanan lunas yang menyimpan ZIP privat saat checkout dapat dikirim otomatis. Respons sukses berarti Resend menerima email. Coba ulang melalui Pesanan dalam 23 jam sejak upaya pertama; setelah itu periksa log provider sebelum mengirim manual.
