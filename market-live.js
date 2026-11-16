// Public Firestore catalogue for Anshel Market.
// "preview" means publicly visible metadata ONLY, never a sale or download.
(async () => {
  const home = document.getElementById("marketLive");
  const detail = document.getElementById("releaseApp");
  const params = new URLSearchParams(location.search);
  if ((!home && !detail) || (home && params.get("konsep") === "1")) return;

  const safe = value => String(value ?? "").replace(/[&<>"']/g,
    c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const rupiah = value => new Intl.NumberFormat("id-ID", {
    style:"currency",currency:"IDR",maximumFractionDigits:0
  }).format(Number(value) || 0);
  const imagePath = p =>
    /^\/previews\/[a-z0-9_-]+\.svg$/.test(p.preview_path || "")
      ? p.preview_path : "/previews/website.svg";

  if (home) {
    home.hidden = false;
    document.querySelector('a[href="#catalog"]')?.setAttribute("href", "#marketLive");
    document.getElementById("marketLiveGrid").textContent = "Memuat katalog…";
  }

  let products = [];
  let product = null;
  try {
    const res = await fetch("/api/market-config", {
      cache: "no-store", signal: AbortSignal.timeout(9000)
    });
    if (!res.ok) throw Error("Konfigurasi Firebase tidak tersedia.");
    const cfg = await res.json();
    if (cfg.provider !== "firebase" || !cfg.configured || !cfg.firebase)
      throw Error("Proyek Firebase belum dikonfigurasi.");
    const { openFirebase } = await import("./firebase-client.js");
    const client = await openFirebase(cfg.firebase);
    if (home) products = await client.listPublicCatalog();
    else product = await client.findPublicProduct(params.get("slug") || "");
  } catch (error) {
    const reason = error?.code === "permission-denied"
      ? "Firestore menolak kueri pratinjau publik. Periksa Security Rules."
      : error?.code === "unavailable"
        ? "Firestore sedang tidak dapat dihubungi. Coba muat ulang halaman."
        : error?.message || "Coba muat ulang halaman.";
    if (home) {
      home.querySelector(".live-controls").hidden = true;
      document.getElementById("marketLiveGrid").innerHTML =
        '<div class="live-empty" role="alert"><strong>Katalog Firebase gagal dimuat.</strong><p>'+
        safe(reason)+'</p></div>';
    } else {
      detail.innerHTML =
        '<section class="not-found" role="alert"><h1>Katalog Firebase gagal dimuat</h1><p>'+
        safe(reason)+'</p><a class="btn btn-primary" href="/">Kembali ke katalog</a></section>';
    }
    return;
  }

  if (home) {
    const grid = document.getElementById("marketLiveGrid");
    const search = document.getElementById("search");
    const category = document.getElementById("liveCategory");
    const sort = document.getElementById("liveSort");
    const count = document.getElementById("liveCount");
    const categoryButtons = [...document.querySelectorAll("[data-category]")];
    const categories = new Set([...category.options].map(option => option.value));
    for (const name of new Set(products.map(item => item.category))) {
      if (!categories.has(name)) {
        category.add(new Option(name, name));
        categories.add(name);
      }
    }
    const orders = ["default", "low", "high", "az"];

    function applyUrl() {
      const saved = new URLSearchParams(location.search);
      search.value = saved.get("q") || "";
      category.value = categories.has(saved.get("kategori")) ? saved.get("kategori") : "";
      sort.value = orders.includes(saved.get("urutkan")) ? saved.get("urutkan") : "default";
    }

    function syncUrl(mode) {
      const url = new URL(location.href);
      for (const [key, value] of Object.entries({
        q: search.value.trim(), kategori: category.value,
        urutkan: sort.value === "default" ? "" : sort.value
      })) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      if (url.href !== location.href) history[mode](null, "", url);
    }

    function draw() {
      const q = (search?.value || "").trim().toLocaleLowerCase("id");
      const selected = category.value;
      const order = sort.value;
      for (const button of categoryButtons)
        button.setAttribute("aria-pressed", String(button.dataset.category === selected));
      const shown = products.filter(p =>
        (!selected || p.category === selected) &&
        [p.name,p.category,p.stack,p.description,p.slug,...(p.features || [])]
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
    function update(mode) {
      draw();
      syncUrl(mode);
    }
    category.addEventListener("change", () => update("pushState"));
    sort.addEventListener("change", () => update("pushState"));
    search.addEventListener("input", () => update("replaceState"));
    for (const button of categoryButtons) {
      button.addEventListener("click", () => {
        category.value = button.dataset.category;
        update("pushState");
      });
    }
    window.addEventListener("popstate", () => {
      applyUrl();
      draw();
    });
    applyUrl();
    draw();
  }

  if (detail) {
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
