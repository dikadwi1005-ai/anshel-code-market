"use client";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import PreviewImage from "./preview-image";
import {rupiah} from "@/lib/utils";
import {usePublicProducts} from "@/lib/use-public-products";
import type {Product} from "@/lib/types";
export default function CompareClient(){
 const params=useSearchParams();const raw=params.get("ids")||"";
 const {items,mode,error}=usePublicProducts();
 const ready=mode!=="loading";
 const ids=raw.split(",").filter(Boolean).slice(0,3);
 const selected=ids.map(id=>items.find(p=>p.id===id)).filter((p):p is Product=>!!p);
 return <><nav className="breadcrumbs"><Link href="/">Katalog</Link><span>/</span><span>Bandingkan</span></nav><h1 className="pageTitle">Bandingkan produk</h1><p className="muted" style={{marginBottom:22}}>Perbandingan informasi pratinjau, bukan rekomendasi pembelian.</p>{!ready?<div className="loading">Memuat produk untuk perbandingan…</div>:error?<p className="noticeAmber" role="alert">{error}</p>:selected.length<2?<div className="emptyState"><h3>Pilih minimal dua produk.</h3><p>Gunakan tombol Bandingkan pada kartu produk di katalog.</p><Link href="/" className="button">Kembali ke katalog</Link></div>:<div className="compareTableWrap"><table className="compareTable"><thead><tr><th>Informasi</th>{selected.map(p=><th key={p.id}><PreviewImage src={p.preview_path} name={p.name}/><strong>{p.name}</strong></th>)}</tr></thead><tbody><tr><th>Kategori</th>{selected.map(p=><td key={p.id}>{p.category}</td>)}</tr><tr><th>Teknologi</th>{selected.map(p=><td key={p.id}>{p.stack}</td>)}</tr><tr><th>Harga</th>{selected.map(p=><td key={p.id}><strong>{rupiah(p.price_idr)}</strong></td>)}</tr><tr><th>Deskripsi</th>{selected.map(p=><td key={p.id}><p>{p.description}</p></td>)}</tr><tr><th>Fitur</th>{selected.map(p=><td key={p.id}><ul>{p.features.map((f,i)=><li key={i}>{f}</li>)}</ul></td>)}</tr><tr><th>Status</th>{selected.map(p=><td key={p.id}><span className="tag">Belum dijual</span></td>)}</tr></tbody></table></div>}
 </>;
}
