"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import ProductCard from "./product-card";
import {concepts} from "@/lib/seed";
import {getPublicProducts,initializeMarket,loadMarketConfig} from "@/lib/firebase";
import type {Product} from "@/lib/types";
export default function SavedClient(){
 const [items,setItems]=useState<Product[]>(concepts);
 const [ids,setIds]=useState<string[]>([]);
 const [ready,setReady]=useState(false);
 useEffect(()=>{try{const raw=JSON.parse(localStorage.getItem("anshel-favorites")||"[]") as Array<string|number>;setIds(raw.map(v=>typeof v==="number"?`concept-${v}`:String(v)))}catch{}
  (async()=>{try{const cfg=await loadMarketConfig();if(!cfg.configured||!cfg.firebase)return;const {db}=initializeMarket(cfg.firebase);const live=await getPublicProducts(db);setItems([...live,...concepts])}catch{}finally{setReady(true)}})();
 },[]);
 const toggle=(id:string)=>{setIds(previous=>{const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id];try{localStorage.setItem("anshel-favorites",JSON.stringify(next))}catch{}return next})};
 const filtered=items.filter(p=>ids.includes(p.id));
 return <><nav className="breadcrumbs"><Link href="/">Katalog</Link><span>/</span><span>Tersimpan</span></nav><div className="catalogTitleRow"><div><span className="eyebrow">KOLEKSI PRIBADI</span><h1 className="pageTitle">Produk tersimpan</h1><p>Disimpan secara lokal di browser, tidak tersinkron antarperangkat.</p></div><Link href="/" className="button">Lihat katalog</Link></div>
 {!ready?<div className="loading">Memuat produk tersimpan…</div>:filtered.length?<div className="productGrid">{filtered.map(p=><ProductCard key={p.id} product={p} saved={true} onSave={toggle}/>)}</div>:<div className="emptyState"><h3>Belum ada produk tersimpan.</h3><p>Pilih tombol hati pada kartu produk untuk menyimpan pratinjau yang ingin dilihat kembali.</p><Link className="button" href="/">Jelajahi katalog</Link></div>}
 </>;
}
