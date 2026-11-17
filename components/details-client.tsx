"use client";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import PreviewImage from "./preview-image";
import ProductCard from "./product-card";
import {usePublicProducts} from "@/lib/use-public-products";
import {rupiah} from "@/lib/utils";
export default function DetailsClient(){
 const params=useSearchParams();const identifier=params.get("slug")||params.get("id");
 const {items:list,mode,error}=usePublicProducts();
 const item=list.find(p=>p.slug===identifier||p.id===identifier)||null;
 const loading=mode==="loading";
 const [saved,setSaved]=useState(false);
 useEffect(()=>{if(!item)return;
  try{const current=JSON.parse(localStorage.getItem("anshel-favorites")||"[]") as Array<string|number>;
    setSaved(current.map(v=>typeof v==="number"?`concept-${v}`:String(v)).includes(item.id));
    const history=JSON.parse(localStorage.getItem("anshel-recent")||"[]") as Array<string|number>;
    const clean=history.map(v=>typeof v==="number"?`concept-${v}`:String(v));
    localStorage.setItem("anshel-recent",JSON.stringify([item.id,...clean.filter(v=>v!==item.id)].slice(0,8)));
  }catch{}
 },[item]);
 const toggle=()=>{if(!item)return;setSaved(prev=>{const next=!prev;try{const list=(JSON.parse(localStorage.getItem("anshel-favorites")||"[]") as Array<string|number>).map(v=>typeof v==="number"?`concept-${v}`:String(v));localStorage.setItem("anshel-favorites",JSON.stringify(next?[...new Set([...list,item.id])]:list.filter(v=>v!==item.id)))}catch{}return next})};
 if(loading)return <div className="loading" role="status">Memuat informasi produk…</div>;
 if(!item)return <div className="emptyState"><h3>Produk tidak ditemukan.</h3><p>{error||"Produk ini mungkin belum diterbitkan sebagai pratinjau atau sudah diarsipkan."}</p><Link className="button" href="/">Kembali ke katalog</Link></div>;
 const related=list.filter(p=>p.id!==item.id).slice(0,3);
 return <><nav className="breadcrumbs"><Link href="/">Katalog</Link><span>/</span><span>{item.category}</span><span>/</span><span>{item.name}</span></nav>
  <div className="detailLayout"><div className="detailPreview"><PreviewImage src={item.preview_path} name={item.name} large/><div className="detailMeta">Pratinjau produk</div></div>
  <section className="detailDescription"><span className="tag">Pratinjau publik</span><p className="eyebrow">{item.category} · Source code</p><h1>{item.name}</h1><p>{item.description}</p><div className="detailMeta"><b>Teknologi</b> · {item.stack}</div><p style={{fontSize:11,marginTop:18,marginBottom:0}}>Harga</p><div className="detailPrice">{rupiah(item.price_idr)}</div><div className="noticeAmber"><strong>Belum dapat dibeli.</strong> Produk masih dalam tahap persiapan. Belum ada ZIP, verifikasi pembayaran, atau unduhan.</div><div className="detailActions"><button className="button" type="button" aria-pressed={saved} onClick={toggle}>{saved?"♥ Tersimpan":"♡ Simpan produk"}</button><Link className="button" href="/">Kembali ke katalog</Link></div></section></div>
  <div className="detailFeatures"><h2>Fitur dan informasi</h2><ul>{item.features.map((f,i)=><li key={i}>{f}</li>)}</ul><div className="detailMeta">Lisensi: {item.license_summary||"Belum ditetapkan"}</div></div>
  {related.length>0&&<section style={{marginTop:35}}><h2 style={{fontSize:21}}>Produk lainnya</h2><div className="relatedGrid">{related.map(p=><ProductCard key={p.id} product={p} saved={false}/>)}</div></section>}
 </>;
}
