"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import ProductCard from "./product-card";
import {categories} from "@/lib/categories";
import {usePublicProducts} from "@/lib/use-public-products";

function storageSet(name:string,list:string[],session=false){try{(session?sessionStorage:localStorage).setItem(name,JSON.stringify(list))}catch{}}
function storageGet(name:string,session=false):string[]{try{const rows=JSON.parse((session?sessionStorage:localStorage).getItem(name)||"[]");return Array.isArray(rows)?rows.map((v:string|number)=>typeof v==="number"?`concept-${v}`:String(v)):[]}catch{return []}}
export default function CatalogClient(){
 const {items,mode}=usePublicProducts();
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("");
 const [sort,setSort]=useState("default");
 const [favorites,setFavorites]=useState<string[]>([]);
 const [compared,setCompared]=useState<string[]>([]);
 const [recent,setRecent]=useState<string[]>([]);
 useEffect(()=>{setFavorites(storageGet("anshel-favorites"));setCompared(storageGet("anshel-compare",true));setRecent(storageGet("anshel-recent"));
   const params=new URLSearchParams(location.search);setSearch(params.get("q")||"");setCategory(params.get("kategori")||"");const urlSort=params.get("urutkan")||"";setSort(["low","high","az"].includes(urlSort)?urlSort:"default");
 },[]);
 const toggleSaved=useCallback((id:string)=>{setFavorites(previous=>{const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id];storageSet("anshel-favorites",next);return next})},[]);
 const toggleCompared=useCallback((id:string)=>{setCompared(previous=>{const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id].slice(0,3);storageSet("anshel-compare",next,true);return next})},[]);
 const syncUrl=(key:string,value:string,fallback="")=>{const url=new URL(location.href);if(value&&value!==fallback)url.searchParams.set(key,value);else url.searchParams.delete(key);history.replaceState(null,"",url.pathname+url.search)};
 const handleCategory=(value:string)=>{setCategory(value);syncUrl("kategori",value)};
 const handleSearch=(value:string)=>{setSearch(value);syncUrl("q",value.trim())};
 const handleSort=(value:string)=>{setSort(value);syncUrl("urutkan",value,"default")};
 const filtered=useMemo(()=>{
  const q=search.toLocaleLowerCase("id").trim();const rows=items.filter(p=>(!category||p.category===category)&&[p.name,p.stack,p.description,p.category].join(" ").toLocaleLowerCase("id").includes(q));
  if(sort==="low")rows.sort((a,b)=>a.price_idr-b.price_idr);
  if(sort==="high")rows.sort((a,b)=>b.price_idr-a.price_idr);
  if(sort==="az")rows.sort((a,b)=>a.name.localeCompare(b.name,"id"));
  return rows;
 },[items,category,search,sort]);
 const realCount=items.length;
 const statusNotice=mode==="error"?"Katalog sedang tidak dapat dimuat. Silakan coba lagi nanti.":"Produk di halaman ini adalah pratinjau. Pembelian dan unduhan belum tersedia.";
 const compareHref="/bandingkan?ids="+encodeURIComponent(compared.join(","));
 return <>
  <header className="catalogPageHeader"><div><h1>Source Code & Template</h1><p>Jelajahi koleksi produk digital, lihat fitur dan pratinjaunya.</p></div><span className="catalogPageNote">Pratinjau katalog · Belum tersedia untuk pembelian</span></header>
  <p className="catalogStatus" role="status">{mode==="loading"?"Memuat katalog…":statusNotice}</p>
  <div className="catalogGridLayout"><aside className="sidebar" aria-label="Filter kategori"><h2>Kategori</h2><button className="sidebarButton" aria-pressed={!category} onClick={()=>handleCategory("")}>Semua produk <span>{realCount}</span></button>{categories.map(c=><button key={c} className="sidebarButton" aria-pressed={category===c} onClick={()=>handleCategory(c)}>{c} <span>{items.filter(i=>i.category===c).length}</span></button>)}<div className="sidebarNote">Produk yang belum memiliki file ZIP dan lisensi final hanya dapat dilihat sebagai pratinjau.</div></aside>
  <section className="catalogBody" id="catalog"><div className="catalogTitleRow"><div><h2>Semua produk</h2><p>Temukan desain dan komponen yang sesuai kebutuhanmu.</p></div><span className="catalogCount">{mode==="loading"?"Memuat…":realCount+" produk"}</span></div>
  <div className="catalogTools"><input id="search" className="control catalogSearch" type="search" value={search} onChange={e=>handleSearch(e.target.value)} placeholder="Cari source code, produk, teknologi…" aria-label="Cari produk"/><select className="control catalogSelect" value={sort} onChange={e=>handleSort(e.target.value)} aria-label="Urutkan produk"><option value="default">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="az">Nama A–Z</option></select><span className="catalogCount">{mode==="loading"?"Memuat…":filtered.length+" dari "+realCount+" pratinjau"}</span></div>
  {mode==="error"&&<p className="noticeAmber" role="alert">Produk belum dapat dimuat saat ini. Silakan coba kembali nanti.</p>}
  {mode==="loading"?<div className="loading" role="status">Memuat produk…</div>:<div className="productGrid" data-testid="catalog-grid">{filtered.length?filtered.map(p=><ProductCard key={p.id} product={p} saved={favorites.includes(p.id)} onSave={toggleSaved} compared={compared.includes(p.id)} onCompare={toggleCompared}/>):<div className="emptyState"><h3>{items.length?"Tidak ada produk yang cocok.":mode==="error"?"Katalog belum tersedia.":"Belum ada produk yang ditampilkan."}</h3><p>{items.length?"Coba ubah kata kunci atau kategori.":mode==="error"?"Silakan coba lagi nanti.":"Belum ada produk yang tersedia dalam katalog."}</p>{items.length>0&&<button type="button" className="button" onClick={()=>{handleCategory("");handleSearch("")}}>Reset filter</button>}</div>}</div>}
  <div className="utilityBar" style={{marginTop:17}}><Link className="button" href="/tersimpan">♡ Tersimpan ({favorites.length})</Link>{compared.length>=2&&<Link className="button" href={compareHref}>Bandingkan ({compared.length})</Link>}</div>
  </section></div>
  {recent.some(id=>items.some(p=>p.id===id))&&<section className="catalogSecondary"><h2 style={{fontSize:17,margin:"0 0 13px"}}>Terakhir dilihat</h2><div className="utilityBar">{recent.slice(0,4).map(id=>{const p=items.find(item=>item.id===id);return p?<Link key={id} className="button buttonQuiet" href={"/rilis?slug="+p.slug}>{p.name}</Link>:null})}<button className="button buttonMini" onClick={()=>{storageSet("anshel-recent",[]);setRecent([])}}>Hapus riwayat</button></div></section>}

 </>;
}
