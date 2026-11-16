"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PreviewImage from "./preview-image";
import { findConcept } from "@/lib/seed";
import { rupiah } from "@/lib/utils";
export default function CheckoutClient(){
 const params=useSearchParams();const product=findConcept(params.get("id"));
 if(!product)return <div className="emptyState"><h3>Produk tidak ditemukan.</h3><p>Produk yang dicari tidak ada dalam katalog contoh.</p><Link className="button" href="/">Kembali ke katalog</Link></div>;
 return <><nav className="breadcrumbs"><Link href="/">Katalog</Link><span>/</span><Link href={`/produk?id=${product.id}`}>Detail produk</Link><span>/</span><span>Ringkasan</span></nav>
 <h1 className="pageTitle">Pratinjau pembelian — Mandiri</h1><p className="muted">Informasi alur pembelian saja. Tidak ada pesanan atau tagihan yang dibuat.</p>
 <div className="checkoutLayout" style={{marginTop:24}}><section className="checkoutPanel"><span className="tag tagAmber">Belum tersedia</span><h2 style={{marginTop:18}}>Pembayaran belum diaktifkan</h2><p>Metode transfer bank Mandiri direncanakan setelah produk, lisensi, dan verifikasi pembayaran siap. Rekening dan penerimaan transaksi belum tersedia.</p><div className="checkoutMethods"><div className="checkoutMethod"><div><strong>Bank Mandiri</strong><span style={{display:"block"}}>Rencana metode pembayaran</span></div><span>Belum aktif</span></div><div className="checkoutMethod"><div><strong>Nomor rekening</strong><span style={{display:"block"}}>Belum dikonfigurasi</span></div><span>—</span></div></div><div className="noticeAmber" style={{marginTop:18}}>Jangan melakukan transfer berdasarkan halaman pratinjau ini.</div><Link href={`/produk?id=${product.id}`} className="button" style={{marginTop:22}}>Kembali ke produk</Link></section>
 <aside className="checkoutPanel"><h2>Ringkasan produk</h2><p>Informasi konsep, bukan tagihan.</p><div className="orderPreview"><PreviewImage src={product.preview_path} name={product.name}/><div><strong>{product.name}</strong><p>{product.category} · {product.stack}</p></div></div><p>{product.description}</p><div className="summaryLine"><span>Jumlah</span><strong>1 konsep</strong></div><div className="summaryLine"><span>Harga ilustratif</span><strong>{rupiah(product.price_idr)}</strong></div><div className="summaryLine"><span>File & lisensi</span><strong>Belum tersedia</strong></div><div className="orderTotal"><strong>Total yang harus dibayar</strong><strong>Belum ditetapkan</strong></div><button className="button buttonPrimary" disabled type="button" style={{width:"100%",marginTop:18}}>Pembelian belum tersedia</button><Link className="textSmall" style={{display:"block",marginTop:12}} href="/kebijakan">Kebijakan & lisensi</Link></aside></div>
 </>;
}
