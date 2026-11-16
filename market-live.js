// Anshel Code Market public catalog: read ONLY Firestore-published products.
// Drafts are protected by Firestore Security Rules. No buyer payments/ZIP links.
(async () => {
  const home = document.getElementById("marketLive");
  const detail = document.getElementById("releaseApp");
  if (!home && !detail) return;

  const safe = value => String(value ?? "").replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rupiah = value => new Intl.NumberFormat("id-ID", {
    style:"currency",currency:"IDR",maximumFractionDigits:0
  }).format(Number(value) || 0);
  const imagePath = p =>
    /^\/previews\/[a-z0-9_-]+\.svg$/.test(p.preview_path || "")
      ? p.preview_path : "/previews/website.svg";

  let products = [];
  try {
    const res = await fetch("/api/market-config", {
      cache: "no-store", signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw Error("Konfigurasi Firebase belum tersedia.");
    const cfg = await res.json();
    if (cfg.provider !== "firebase" || !cfg.configured || !cfg.firebase)
      throw Error("Firebase belum terhubung.");
    const { openFirebase } = await import("./firebase-client.js");
    const client = await openFirebase(cfg.firebase);
    products = await client.listPublished();
  } catch {
    if (detail) {
      detail.innerHTML =
        '<section class="not-found"><h1>Katalog rilis belum tersedia</h1>'+
        '<p>Firebase khusus marketplace belum terhubung atau daftar rilis belum dapat dimuat. '+
        'Kamu masih bisa menjelajahi konsep produk di katalog.</p>'+
        '<a class="btn btn-primary" href="/">Kembali ke katalog</a></section>';
    }
    return;
  }

  if (home && products.length) {
    home.hidden = false;
    document.getElementById("marketLiveGrid").innerHTML = products.map(p =>
      '<a class="live-card" href="/rilis.html?slug='+encodeURIComponent(p.slug)+'">'+
      '<img src="'+imagePath(p)+'" alt="Pratinjau '+safe(p.name)+
      '" width="1200" height="780" loading="lazy">'+
      '<div class="live-info"><small>'+safe(p.category)+' · Terbit</small>'+
      '<strong>'+safe(p.name)+'</strong>'+
      '<span>'+rupiah(p.price_idr)+'</span><em>Pembayaran belum aktif</em></div></a>'
    ).join("");
  }

  if (detail) {
    const slug = new URLSearchParams(location.search).get("slug") || "";
    const p = products.find(item => item.slug === slug);
    if (!p) {
      detail.innerHTML =
        '<section class="not-found"><h1>Produk rilis tidak ditemukan</h1>'+
        '<p>Produk ini belum diterbitkan atau telah diarsipkan.</p>'+
        '<a class="btn btn-primary" href="/">Kembali ke katalog</a></section>';
      return;
    }
    document.title = p.name + " — Anshel Market";
    const features = Array.isArray(p.features) ? p.features : [];
    detail.innerHTML =
      '<nav class="breadcrumbs"><a href="/">Katalog</a><span>/</span>'+
      '<span>Produk terbit</span></nav>'+
      '<div class="product-hero"><div class="showcase"><div class="gallery-frame">'+
      '<img src="'+imagePath(p)+'" width="1200" height="780" alt="Pratinjau '+
      safe(p.name)+'"><div class="gallery-caption"><strong>Preview produk</strong>'+
      '<span>Data produk dari Cloud Firestore</span></div></div></div>'+
      '<section class="summary"><span class="pill">Terbit · Pembayaran belum aktif</span>'+
      '<div class="subtype">'+safe(p.category)+'</div><h1>'+safe(p.name)+'</h1>'+
      '<p class="intro">'+safe(p.description)+'</p><div class="divider"></div>'+
      '<div class="price-caption">Harga katalog</div>'+
      '<div class="price">'+rupiah(p.price_idr)+'</div>'+
      '<div class="note"><span>ⓘ</span><span><b>Belum dapat dibeli.</b> '+
      'Sistem pesanan, verifikasi Mandiri, dan pengiriman ZIP belum tersedia. '+
      'Jangan melakukan transfer berdasarkan halaman ini.</span></div>'+
      '<div class="actions"><a class="btn btn-primary" href="/">← Kembali ke katalog</a></div>'+
      '</section></div>'+
      '<div class="section-shell"><section class="info-card">'+
      '<h2 class="section-head">Fitur produk</h2><ul class="planned-list">'+
      features.map(item=>'<li>'+safe(item)+'</li>').join("")+'</ul></section>'+
      '<section class="info-card"><h2 class="section-head">Informasi teknis</h2>'+
      '<dl class="spec-list"><div><dt>Teknologi</dt><dd>'+safe(p.stack)+'</dd></div>'+
      '<div><dt>Lisensi</dt><dd>'+safe(p.license_summary)+'</dd></div>'+
      '<div><dt>Pembayaran</dt><dd>Belum aktif</dd></div></dl></section></div>';
  }
})();
