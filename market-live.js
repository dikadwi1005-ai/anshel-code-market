// Read-only published catalog integration. Drafts and private ZIP paths are
// protected by Supabase RLS. The shop still has NO payment capability.
(async()=>{
 const home=document.getElementById("marketLive");
 const detail=document.getElementById("releaseApp");
 if(!home&&!detail)return;
 const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
 const preview=p=>/^\/previews\/[a-z0-9_-]+\.svg$/.test(p.preview_path||"")?p.preview_path:"/previews/website.svg";
 let products=[];
 try{
   const r=await fetch("/api/market-config",{cache:"no-store"});
   if(!r.ok)throw Error("Belum tersambung");
   const c=await r.json();
   if(!c.configured||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(c.url)||!c.publishableKey)throw Error("Konfigurasi belum tersedia");
   const res=await fetch(c.url+"/rest/v1/market_products?select=id,slug,name,category,stack,description,price_idr,status,features,preview_path,license_summary&status=eq.published&order=created_at.desc&limit=24",{
     headers:{"apikey":c.publishableKey},cache:"no-store"
   });
   if(!res.ok)throw Error("Daftar rilis belum dapat dibaca");
   products=await res.json();
   if(!Array.isArray(products))products=[];
 }catch{
   if(detail)detail.innerHTML='<section class="not-found"><h1>Data produk belum terhubung</h1><p>Produk rilis dari Supabase belum dapat dimuat. Katalog konsep masih bisa dijelajahi.</p><a class="btn" href="/">Kembali ke katalog</a></section>';
   return;
 }
 if(home&&products.length){
   home.hidden=false;
   const grid=document.getElementById("marketLiveGrid");
   grid.innerHTML=products.map(p=>'<a class="live-card" href="/rilis.html?slug='+encodeURIComponent(p.slug)+'">'+
     '<img src="'+preview(p)+'" alt="Pratinjau '+safe(p.name)+'" width="1200" height="780" loading="lazy">'+
     '<div class="live-info"><small>'+safe(p.category)+' · Terbit</small><strong>'+safe(p.name)+'</strong>'+
     '<span>'+money(p.price_idr)+'</span><em>Pembayaran belum aktif</em></div></a>').join("");
 }
 if(detail){
   const slug=new URLSearchParams(location.search).get("slug")||"";
   const p=products.find(item=>item.slug===slug);
   if(!p){
     detail.innerHTML='<section class="not-found"><h1>Produk rilis tidak ditemukan</h1><p>Produk ini belum diterbitkan atau sudah diarsipkan.</p><a class="btn" href="/">Kembali ke katalog</a></section>';return;
   }
   document.title=p.name+" — Anshel Market";
   const features=Array.isArray(p.features)?p.features:[];
   detail.innerHTML='<nav class="breadcrumbs"><a href="/">Katalog</a><span>/</span><span>Produk terbit</span></nav>'+
     '<div class="product-hero">'+
     '<div class="showcase"><div class="gallery-frame"><img src="'+preview(p)+'" width="1200" height="780" alt="Pratinjau '+safe(p.name)+'"><div class="gallery-caption"><strong>Preview produk</strong><span>Produk dari database Supabase</span></div></div></div>'+
     '<section class="summary"><span class="pill">Terbit · Pembayaran belum aktif</span><div class="subtype">'+safe(p.category)+'</div><h1>'+safe(p.name)+'</h1>'+
     '<p class="intro">'+safe(p.description)+'</p><div class="divider"></div><div class="price-caption">Harga katalog</div><div class="price">'+money(p.price_idr)+'</div>'+
     '<div class="note"><span>ⓘ</span><span><b>Belum dapat dibeli.</b> Sistem pesanan dan verifikasi transfer Mandiri belum tersedia. Jangan melakukan transfer berdasarkan halaman ini.</span></div>'+
     '<div class="actions"><a class="btn btn-primary" href="/">← Kembali ke katalog</a></div></section></div>'+
     '<div class="section-shell"><section class="info-card"><h2 class="section-head">Fitur produk</h2><ul class="planned-list">'+features.map(f=>'<li>'+safe(f)+'</li>').join("")+'</ul></section>'+
     '<section class="info-card"><h2 class="section-head">Informasi teknis</h2><dl class="spec-list"><div><dt>Teknologi</dt><dd>'+safe(p.stack)+'</dd></div><div><dt>Lisensi</dt><dd>'+safe(p.license_summary)+'</dd></div><div><dt>Pembayaran</dt><dd>Belum aktif</dd></div></dl></section></div>';
 }
})();
