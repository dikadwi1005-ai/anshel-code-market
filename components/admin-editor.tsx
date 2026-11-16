"use client";
import {useEffect,useState,type FormEvent} from "react";
import type {Product} from "@/lib/types";
import type {ProductInput} from "@/lib/firebase";
const blank:ProductInput={name:"",slug:"",category:"Website",stack:"",description:"",price_idr:0,status:"draft",features:[],preview_path:"/previews/website.svg",license_summary:""};
export default function AdminEditor({product,onClose,onSave,busy}:{product:Product|null;onClose:()=>void;onSave:(input:ProductInput)=>Promise<void>;busy:boolean}){
 const [form,setForm]=useState<ProductInput>(blank);
 const [error,setError]=useState("");
 useEffect(()=>{setForm(product?{name:product.name,slug:product.slug,category:product.category,stack:product.stack,description:product.description,price_idr:product.price_idr,status:product.status,features:product.features,preview_path:product.preview_path,license_summary:product.license_summary}:blank);setError("")},[product]);
 const edit=<K extends keyof ProductInput>(key:K,value:ProductInput[K])=>setForm(current=>({...current,[key]:value}));
 const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setError("");
  if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)||form.slug.length>120){setError("Slug harus berupa huruf kecil, angka dan tanda penghubung.");return}
  if(form.name.trim().length<3||form.name.length>160||!Number.isSafeInteger(form.price_idr)||form.price_idr<0){setError("Periksa nama dan nominal harga.");return}
  if(!["draft","preview","archived"].includes(form.status)){setError("Status penjualan akhir belum tersedia.");return}
  if(form.preview_path&&!/^\/previews\/[a-z0-9_-]+\.svg$/.test(form.preview_path)){setError("Gunakan preview dari /previews/*.svg.");return}
  if(form.features.length>30){setError("Maksimal 30 fitur.");return}
  try{await onSave({...form,name:form.name.trim(),slug:form.slug.trim(),description:form.description.trim(),stack:form.stack.trim(),license_summary:form.license_summary.trim()})}catch(e){setError(e instanceof Error?e.message:"Perubahan gagal disimpan.")}
 };
 return <div className="editorOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><section className="editorDialog" role="dialog" aria-modal="true" aria-label={product?"Edit produk":"Tambah produk"}><div className="editorTop"><div><span className="eyebrow">PRODUCT EDITOR</span><h2>{product?"Edit produk":"Tambah produk"}</h2></div><button className="buttonIcon" disabled={busy} aria-label="Tutup editor" onClick={onClose}>×</button></div>
  <form onSubmit={submit}><div className="editorFields">
   <label className="field"><span className="fieldLabel">Nama produk</span><input className="control" value={form.name} maxLength={160} onChange={e=>edit("name",e.target.value)} required/></label>
   <label className="field"><span className="fieldLabel">Slug</span><input className="control" value={form.slug} onChange={e=>edit("slug",e.target.value)} maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" required/></label>
   <label className="field"><span className="fieldLabel">Kategori</span><select className="control" value={form.category} onChange={e=>edit("category",e.target.value)}>{["Website","Dashboard","AI Tools","Template","Lainnya"].map(c=><option key={c}>{c}</option>)}</select></label>
   <label className="field"><span className="fieldLabel">Harga ilustratif (Rp)</span><input className="control" type="number" min={0} max={1000000000} step={1} value={form.price_idr} onChange={e=>edit("price_idr",Number(e.target.value))} required/></label>
   <label className="field editorFull"><span className="fieldLabel">Teknologi</span><input className="control" value={form.stack} maxLength={300} onChange={e=>edit("stack",e.target.value)}/></label>
   <label className="field editorFull"><span className="fieldLabel">Deskripsi</span><textarea className="control controlArea" value={form.description} maxLength={5000} onChange={e=>edit("description",e.target.value)}/></label>
   <label className="field editorFull"><span className="fieldLabel">Fitur (satu fitur per baris)</span><textarea className="control controlArea" value={form.features.join("\n")} onChange={e=>edit("features",e.target.value.split("\n").map(x=>x.trim()).filter(Boolean))}/></label>
   <label className="field editorFull"><span className="fieldLabel">Path preview (SVG)</span><input className="control" value={form.preview_path} onChange={e=>edit("preview_path",e.target.value)} placeholder="/previews/website.svg"/></label>
   <label className="field editorFull"><span className="fieldLabel">Ringkasan lisensi</span><textarea className="control controlArea" value={form.license_summary} onChange={e=>edit("license_summary",e.target.value)}/></label>
   <label className="field"><span className="fieldLabel">Visibilitas</span><select className="control" value={form.status} onChange={e=>edit("status",e.target.value as ProductInput["status"])}><option value="draft">Draft · privat</option><option value="preview">Pratinjau publik</option><option value="archived">Arsip</option>{form.status==="published"&&<option value="published" disabled>Terbit lama (terkunci)</option>}</select></label>
  </div><div className="adminNotice">Pratinjau publik hanya menampilkan informasi di website. File ZIP, pembayaran, serta unduhan masih tidak tersedia. Jangan menaruh source code privat di folder publik.</div>{error&&<p role="alert" className="adminToast">{error}</p>}<div className="editorActions"><button className="button" disabled={busy} type="button" onClick={onClose}>Batal</button><button className="button buttonPrimary" disabled={busy} type="submit">{busy?"Menyimpan…":"Simpan produk"}</button></div></form>
 </section></div>;
}
