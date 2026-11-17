"use client";
import Link from "next/link";
import PreviewImage from "./preview-image";
import type { Product } from "@/lib/types";
import { rupiah } from "@/lib/utils";
export function productHref(p:Product){return "/rilis?slug="+encodeURIComponent(p.slug)}
export default function ProductCard({product,saved,onSave,compared,onCompare}:{product:Product;saved:boolean;onSave?:(id:string)=>void;compared?:boolean;onCompare?:(id:string)=>void}){
 const href=productHref(product);
 return <article className="productCard" data-testid="product-card">
   <Link href={href} className="cardImageLink"><PreviewImage src={product.preview_path} name={product.name}/></Link>
   <div className="cardInfo">
    <span className="tag cardStatus">Pratinjau publik</span>
    <small>{product.category} · {product.stack}</small>
    <h3><Link href={href}>{product.name}</Link></h3>
    <p>{product.description}</p>
    <div className="cardBottom"><strong>{rupiah(product.price_idr)}</strong><div className="cardActions">
      {onCompare&&<label className="textSmall" style={{display:"inline-flex",gap:5,alignItems:"center"}}><input aria-label={`Bandingkan ${product.name}`} type="checkbox" checked={!!compared} onChange={()=>onCompare(product.id)}/> Bandingkan</label>}
      {onSave&&<button className="buttonIcon" aria-label={saved?`Hapus ${product.name} dari tersimpan`:`Simpan ${product.name}`} aria-pressed={saved} onClick={()=>onSave(product.id)} type="button">{saved?"♥":"♡"}</button>}
      <Link className="button buttonMini" href={href}>Detail</Link>
    </div></div>
   </div>
 </article>;
}
