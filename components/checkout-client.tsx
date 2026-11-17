"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BuyerDialog from "./buyer-dialog";
import PreviewImage from "./preview-image";
import {usePublicProducts} from "@/lib/use-public-products";
import { rupiah } from "@/lib/utils";
export default function CheckoutClient(){
 const params=useSearchParams();const {items,mode,error}=usePublicProducts();
 const identifier=params.get("id")||params.get("slug");
 const product=items.find(p=>p.id===identifier||p.slug===identifier);
 if(mode==="loading")return <div className="loading" role="status">Memuat produk…</div>;
 if(error)return <p className="noticeAmber" role="alert">{error}</p>;
 if(!product)return <div className="emptyState"><h3>Produk tidak ditemukan.</h3><p>Produk yang dicari tidak tersedia dalam katalog.</p><Link className="button" href="/">Kembali ke katalog</Link></div>;
 return <><nav className="breadcrumbs"><Link href="/">Katalog</Link><span>/</span><Link href={`/produk?id=${encodeURIComponent(product.id)}`}>Detail produk</Link><span>/</span><span>Ringkasan</span></nav>
 <h1 className="pageTitle">Pembayaran QRIS</h1><p className="muted">Pengiriman dilakukan lewat email akun pembeli setelah pembayaran terverifikasi.</p>
 <div className="checkoutLayout" style={{marginTop:24}}><section className="checkoutPanel"><h2>Akun dan pembayaran</h2><BuyerDialog productId={product.id} /></section>
 <aside className="checkoutPanel"><h2>Ringkasan produk</h2><div className="orderPreview"><PreviewImage src={product.preview_path} name={product.name}/><div><strong>{product.name}</strong><p>{product.category} · {product.stack}</p></div></div><p>{product.description}</p><div className="summaryLine"><span>Jumlah</span><strong>1 produk</strong></div><div className="summaryLine"><span>Harga</span><strong>{rupiah(product.price_idr)}</strong></div><div className="summaryLine"><span>Pengiriman</span><strong>Email</strong></div><Link className="textSmall" style={{display:"block",marginTop:12}} href="/kebijakan">Kebijakan & lisensi</Link></aside></div>
 </>;
}
