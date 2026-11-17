"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import ProductCard from "./product-card";
import {usePublicProducts} from "@/lib/use-public-products";
export default function SavedClient(){
 const {items,mode,error}=usePublicProducts();
 const [ids,setIds]=useState<string[]>([]);
 const ready=mode!=="loading";
 useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem("anshel-favorites")||"[]") as Array<string|number>;setIds(raw.map(v=>typeof v==="number"?`concept-${v}`:String(v)))}catch{}
 },[]);
 const toggle=(id:string)=>{setIds(previous=>{const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id];try{localStorage.setItem("anshel-favorites",JSON.stringify(next))}catch{}return next})};
 const filtered=items.filter(p=>ids.includes(p.id));
 return <><nav className="breadcrumbs"><Link href="/">Katalog</Link><span>/</span><span>Tersimpan</span></nav><div className="catalogTitleRow"><div><span className="eyebrow">KOLEKSI PRIBADI</span><h1 className="pageTitle">Produk tersimpan</h1><p>Disimpan secara lokal di browser, tidak tersinkron antarperangkat.</p></div><Link href="/" className="button">Lihat katalog</Link></div>
 {!ready?<div className="loading">Memuat produk tersimpan…</div>:error?<p className="noticeAmber" role="alert">{error}</p>:filtered.length?<div className="productGrid">{filtered.map(p=><ProductCard key={p.id} product={p} saved={true} onSave={toggle}/>)}</div>:<div className="emptyState"><h3>Belum ada produk tersimpan.</h3><p>Pilih tombol hati pada kartu produk untuk menyimpan pratinjau yang ingin dilihat kembali.</p><Link className="button" href="/">Jelajahi katalog</Link></div>}
 </>;
}
