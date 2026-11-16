// Public Firestore catalogue for Anshel Market.
// "preview" means publicly visible metadata ONLY, never a sale or download.
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
  let configured = false;
  try {
    const res = await fetch("/api/market-config", {
      cache: "no-store", signal: AbortSignal.timeout(9000)
    });
    if (!res.ok) throw Error("Konfigurasi Firebase tidak tersedia.");
    const cfg = await res.json();
    if (cfg.provider !== "firebase" || !cfg.configured || !cfg.firebase)
      throw Error("Proyek Firebase belum dikonfigurasi.");
    configured = true;
    const { openFirebase } = await import("./firebase-client.js");
    const client = await openFirebase(cfg.firebase);
    products = await client.listPublicCatalog();
  } catch (error) {
    if (home && configured) {
      home.hidden = false;
      document.getElementById("marketLiveGrid").innerHTML =
        '<div class="live-empty"><strong>Data Firebase belum bisa dimuat.</strong>'+
        '<p>Katalog konsep lama masih tersedia di bawah. Periksa aturan keamanan Firestore '+
        'dan koneksi proyek Anshel Code Market.</p></div>';
      document.querySelector(".live-controls").hidden = true;
    }
    if (detail) {
      detail.innerHTML =
        '<section class="not-found"><h1>Katalog belum dapat dimuat</h1>'+
        '<p>Data produk Firestore belum tersedia. Kamu masih bisa melihat konsep lama di katalog.</p>'+
        '<a class="btn btn-primary" href="/">Kembali ke katalog</a></section>';
    }
    return;
  }

  if (home) {
    // Once Firestore is connected, its public preview documents become the
    // primary catalogue. Keep old hard-coded concepts available on demand.
    home.hidden = false;
    const legacy = document.getElementById("conceptLayout");
    const recent = document.getElementById("recentSection");
    const toggle = document.getElementById("showDemoCatalog");
    const grid = document.getElementById("marketLiveGrid");
    const search = document.getElementById("search");
    const category = document.getElementById("liveCategory");
    const sort = document.getElementById("liveSort");
    const count = document.getElementById("liveCount");

    if (legacy) legacy.hidden = true;
    if (recent) recent.hidden = true;
    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener("click", () => {
        if (!legacy) return;
        legacy.hidden = !legacy.hidden;
        legacy.classList.toggle("legacy-visible", !legacy.hidden);
        toggle.textContent = legacy.hidden
          ? "Lihat 6 konsep katalog lama (Simpan/Bandingkan)"
          : "Sembunyikan 6 konsep katalog lama";
        toggle.setAttribute("aria-expanded", String(!legacy.hidden));
        if (recent) recent.hidden = legacy.hidden || !recent.children.length ||
          !document.getElementById("recentGrid")?.children.length;
      });
      toggle.textContent = "Lihat 6 konsep katalog lama (Simpan/Bandingkan)";
    }
    document.querySelectorAll('a[href="#catalog"]').forEach(a=>{
      a.setAttribute("href", "#marketLive");
    });
    const notice = document.querySelector(".catalog-notice");
    if (notice) notice.innerHTML =
      '<strong>Katalog Firestore</strong> Data produk diambil dari Firebase. '+
      'Status pratinjau berarti belum bisa dibeli, harga belum menjadi tagihan.';
    const savedCategory = new URLSearchParams(location.search).get("kategori");
    if (savedCategory && [...category.options].some(opt=>opt.value===savedCategory))
      category.value = savedCategory;
    const savedSort = new URLSearchParams(location.search).get("urutkan");
    if (["low","high","az"].includes(savedSort)) sort.value = savedSort;

    function draw() {
      const q = (search?.value || "").trim().toLocaleLowerCase("id");
      const selected = category.value;
      const order = sort.value;
      const shown = products.filter(p =>
        (!selected || p.category === selected) &&
        [p.name,p.category,p.stack,p.description,p.slug]
          .join(" ").toLocaleLowerCase("id").includes(q));
      if (order === "low") shown.sort((a,b)=>a.price_idr-b.price_idr);
      if (order === "high") shown.sort((a,b)=>b.price_idr-a.price_idr);
      if (order === "az") shown.sort((a,b)=>a.name.localeCompare(b.name,"id"));
      const number = shown.length + " dari " + products.length + " pratinjau";
      count.textContent = number;
      const headerCount = document.getElementById("count");
      if (headerCount) headerCount.textContent = number;
      grid.innerHTML = shown.length ? shown.map(p =>
        '<a class="live-card" href="/rilis.html?slug='+encodeURIComponent(p.slug)+'">'+
        '<img src="'+imagePath(p)+'" alt="Pratinjau '+safe(p.name)+
        '" width="1200" height="780" loading="lazy">'+
        '<div class="live-info"><small>'+safe(p.category)+' · Firestore</small>'+
        '<strong>'+safe(p.name)+'</strong>'+
        '<p>'+safe(p.description)+'</p>'+
        '<span class="live-status">Pratinjau · Belum dijual</span>'+
        '<span class="live-price">'+rupiah(p.price_idr)+'</span>'+
        '<span class="live-price-label">Harga ilustratif · Lihat detail</span>'+
        '</div></a>'
      ).join("") :
        '<div class="live-empty"><strong>'+
        (products.length ? "Tidak ada produk yang cocok." : "Belum ada pratinjau publik.")+
        '</strong><p>'+
        (products.length
          ? "Coba kategori atau kata kunci lain."
          : "Produk yang masih berstatus Draft hanya bisa dilihat admin. "+
            "Dari dashboard, ubah statusnya menjadi Pratinjau publik agar muncul di sini.")+
        '</p></div>';
    }
    category.addEventListener("change", draw);
    sort.addEventListener("change", draw);
    search?.addEventListener("input", draw);
    document.querySelectorAll("[data-category]").forEach(btn=>
      btn.addEventListener("click", () => {
        if ([...category.options].some(opt=>opt.value===btn.dataset.category))
          category.value = btn.dataset.category;
        else category.value = "";
        draw();
      }));
    window.addEventListener("popstate",()=>{
      const params = new URLSearchParams(location.search);
      const next = params.get("kategori") || "";
      category.value = [...category.options].some(opt=>opt.value===next) ? next : "";
      draw();
    });
    draw();
  }

  if (detail) {
    const slug = new URLSearchParams(location.search).get("slug") || "";
    const product = products.find(item => item.slug === slug);
    if (!product) {
      detail.innerHTML =
        '<section class="not-found"><h1>Pratinjau produk tidak ditemukan</h1>'+
        '<p>Produk ini belum ditampilkan admin atau sudah diarsipkan.</p>'+
        '<a class="btn btn-primary" href="/">Kembali ke katalog</a></section>';
      return;
    }
    const p = product;
    document.title = p.name + " — Anshel Market";
    const features = Array.isArray(p.features) ? p.features : [];
    detail.innerHTML =
      '<nav class="breadcrumbs"><a href="/">Katalog</a><span>/</span>'+
      '<span>Pratinjau Firebase</span></nav>'+
      '<div class="product-hero"><div class="showcase"><div class="gallery-frame">'+
      '<img src="'+imagePath(p)+'" width="1200" height="780" alt="Pratinjau '+
      safe(p.name)+'"><div class="gallery-caption"><strong>Pratinjau produk</strong>'+
      '<span>Data berasal dari Cloud Firestore</span></div></div></div>'+
      '<section class="summary"><span class="pill">Pratinjau · Pembayaran belum aktif</span>'+
      '<div class="subtype">'+safe(p.category)+'</div><h1>'+safe(p.name)+'</h1>'+
      '<p class="intro">'+safe(p.description)+'</p><div class="divider"></div>'+
      '<div class="price-caption">Harga ilustratif</div>'+
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
      '<div><dt>Lisensi</dt><dd>'+safe(p.license_summary || "Belum ditetapkan")+'</dd></div>'+
      '<div><dt>Pembayaran</dt><dd>Belum aktif</dd></div></dl></section></div>';
  }
})();
