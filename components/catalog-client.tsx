"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import ProductCard from "./product-card";
import {concepts,categories} from "@/lib/seed";
import type {Product} from "@/lib/types";
import {loadMarketConfig,initializeMarket,getPublicProducts} from "@/lib/firebase";

type Mode="loading"|"firestore"|"fallback"|"error";
function storageSet(name:string,list:string[],session=false){try{(session?sessionStorage:localStorage).setItem(name,JSON.stringify(list))}catch{}}
function storageGet(name:string,session=false):string[]{try{const rows=JSON.parse((session?sessionStorage:localStorage).getItem(name)||"[]");return Array.isArray(rows)?rows.map((v:string|number)=>typeof v==="number"?`concept-${v}`:String(v)):[]}catch{return []}}
export default function CatalogClient(){
 const [mode,setMode]=useState<Mode>("loading");
 const [items,setItems]=useState<Product[]>([]);
 const [error,setError]=useState("");
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("");
 const [sort,setSort]=useState("default");
 const [favorites,setFavorites]=useState<string[]>([]);
 const [compared,setCompared]=useState<string[]>([]);
 const [recent,setRecent]=useState<string[]>([]);
 useEffect(()=>{setFavorites(storageGet("anshel-favorites"));setCompared(storageGet("anshel-compare",true));setRecent(storageGet("anshel-recent"));
   const params=new URLSearchParams(location.search);setSearch(params.get("q")||"");setCategory(params.get("kategori")||"");setSort(params.get("urutkan")||"default");
   let active=true;
   (async()=>{try{const config=await loadMarketConfig();if(!config.configured||!config.firebase){if(active){setItems(concepts);setMode("fallback")}return}
     const {db}=initializeMarket(config.firebase);const rows=await getPublicProducts(db);if(active){setItems(rows);setMode("firestore")}
   }catch(err){if(active){setError(err instanceof Error?err.message:"Data Firebase belum dapat dimuat");setItems(concepts);setMode("error")}}})();
   return()=>{active=false};
 },[]);
 const toggleSaved=useCallback((id:string)=>{setFavorites(previous=>{const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id];storageSet("anshel-favorites",next);return next})},[]);
 const toggleCompared=useCallback((id:string)=>{setCompared(previous=>{const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id].slice(0,3);storageSet("anshel-compare",next,true);return next})},[]);
 const handleCategory=(value:string)=>{setCategory(value);const url=new URL(location.href);if(value)url.searchParams.set("kategori",value);else url.searchParams.delete("kategori");history.replaceState(null,"",url.pathname+url.search)};
 const filtered=useMemo(()=>{
  const q=search.toLocaleLowerCase("id").trim();const rows=items.filter(p=>(!category||p.category===category)&&[p.name,p.stack,p.description,p.category].join(" ").toLocaleLowerCase("id").includes(q));
  if(sort==="low")rows.sort((a,b)=>a.price_idr-b.price_idr);
  if(sort==="high")rows.sort((a,b)=>b.price_idr-a.price_idr);
  if(sort==="az")rows.sort((a,b)=>a.name.localeCompare(b.name,"id"));
  return rows;
 },[items,category,search,sort]);
 const realCount=items.length;
 const statusNotice=mode==="firestore"?"Produk yang ditampilkan berasal dari Firebase Firestore. Semua harga masih ilustratif dan pembayaran belum aktif.":
  mode==="error"?"Firebase belum dapat dimuat. Katalog contoh ditampilkan sebagai cadangan; bukan data produk aktif.":
  "Katalog contoh: belum ada produk yang siap dibeli atau diunduh.";
 const compareHref="/bandingkan?ids="+encodeURIComponent(compared.join(","));
 return <>
  <section className="hero"><div><div className="eyebrow">ANSHEL CODE MARKET · SOURCE CODE & DIGITAL TEMPLATES</div><h1>Bangun lebih cepat dengan ide yang siap dikembangkan.</h1><p>Jelajahi antarmuka aplikasi, template website, dan konsep source code. Periksa pratinjau dan fitur sebelum produk siap dirilis.</p></div><div className="heroSide"><span className="tag">✨ Marketplace dalam pengembangan</span><div className="heroMetrics"><div className="metricPill"><strong>{mode==="loading"?"—":realCount}</strong><span>{mode==="firestore"?"Pratinjau Firestore":"Konsep produk"}</span></div><div className="metricPill"><strong>0</strong><span>Transaksi aktif</span></div></div></div></section>
  <div className="smallNotice"><strong>Informasi katalog</strong>{mode==="loading"?"Menghubungkan katalog ke Firebase…":statusNotice}</div>
  <div className="catalogGridLayout"><aside className="sidebar" aria-label="Filter kategori"><h2>Kategori</h2><button className="sidebarButton" aria-pressed={!category} onClick={()=>handleCategory("")}>Semua produk <span>{realCount}</span></button>{categories.map(c=><button key={c} className="sidebarButton" aria-pressed={category===c} onClick={()=>handleCategory(c)}>{c} <span>{items.filter(i=>i.category===c).length}</span></button>)}<div className="sidebarNote">Produk yang belum memiliki file ZIP dan lisensi final hanya dapat dilihat sebagai pratinjau.</div></aside>
  <section className="catalogBody" id="catalog"><div className="catalogTitleRow"><div><h2>{mode==="firestore"?"Katalog dari Firebase":"Jelajahi source code"}</h2><p>{mode==="firestore"?"Dikelola langsung melalui dashboard administrator.":"Koleksi pratinjau konsep."}</p></div><span className="tag tagGray">Belum dijual</span></div>
  <div className="catalogTools"><input id="search" className="control catalogSearch" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari source code, produk, teknologi…" aria-label="Cari produk"/><select className="control catalogSelect" value={sort} onChange={e=>setSort(e.target.value)} aria-label="Urutkan produk"><option value="default">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="az">Nama A–Z</option></select><span className="catalogCount">{mode==="loading"?"Memuat…":filtered.length+" dari "+realCount+" pratinjau"}</span></div>
  {mode==="error"&&<p className="noticeAmber" role="alert">Tidak dapat membaca Firestore: {error}. Periksa Firestore Security Rules. Daftar di bawah hanya konsep lama.</p>}
  {mode==="loading"?<div className="loading" role="status">Mengambil produk dari Firestore…</div>:<div className="productGrid" data-testid="catalog-grid">{filtered.length?filtered.map(p=><ProductCard key={p.id} product={p} saved={favorites.includes(p.id)} onSave={toggleSaved} compared={compared.includes(p.id)} onCompare={toggleCompared}/>):<div className="emptyState"><h3>{items.length?"Tidak ada produk yang cocok.":"Belum ada pratinjau publik."}</h3><p>{items.length?"Coba ubah kata kunci atau kategori.":"Produk draft tidak terlihat oleh pengunjung. Tampilkan satu produk dari dashboard admin agar muncul di sini."}</p>{items.length>0&&<button type="button" className="button" onClick={()=>{setCategory("");setSearch("")}}>Reset filter</button>}</div>}</div>}
  <div className="utilityBar" style={{marginTop:17}}><Link className="button" href="/tersimpan">♡ Tersimpan ({favorites.length})</Link>{compared.length>=2&&<Link className="button" href={compareHref}>Bandingkan ({compared.length})</Link>}</div>
  {mode==="firestore"&&<details className="catalogSecondary"><summary>Lihat 6 konsep katalog lama (referensi desain)</summary><p>Berikut hanya contoh konsep sebelum Firebase digunakan. Tidak termasuk katalog yang diterbitkan administrator.</p><div className="productGrid">{concepts.map(p=><ProductCard key={p.id} product={p} saved={favorites.includes(p.id)} onSave={toggleSaved}/>)}</div></details>}
  </section></div>
  {recent.length>0&&<section className="catalogSecondary"><h2 style={{fontSize:17,margin:"0 0 13px"}}>Terakhir dilihat</h2><div className="utilityBar">{recent.slice(0,4).map(id=>{const p=[...items,...concepts].find(item=>item.id===id);return p?<Link key={id} className="button buttonQuiet" href={id.startsWith("concept-")?"/produk?id="+id:"/rilis?slug="+p.slug}>{p.name}</Link>:null})}<button className="button buttonMini" onClick={()=>{storageSet("anshel-recent",[]);setRecent([])}}>Hapus riwayat</button></div></section>}
  <div className="infoColumns"><section><h2>Bagaimana cara membeli?</h2><p>Pembelian masih dinonaktifkan selama produk, lisensi, dan proses verifikasi pembayaran Mandiri belum siap. Jangan transfer berdasarkan harga ilustratif.</p></section><section><h2>Tentang produk</h2><p>Informasi katalog diambil dari Firebase jika tersedia. Admin dapat menyembunyikan dan menampilkan pratinjau; pengunjung tidak dapat mengakses draft maupun berkas ZIP.</p></section></div>
 </>;
}
