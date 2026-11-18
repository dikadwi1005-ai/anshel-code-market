"use client";

import {useEffect,useRef,useState,type FormEvent} from "react";
import type {User} from "firebase/auth";
import type {Product} from "@/lib/types";

export default function AdminSaleReadiness({user,product,close}:{user:User;product:Product;close:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [fileName,setFileName]=useState("");
  const [reference,setReference]=useState("");
  const [active,setActive]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [checkout,setCheckout]=useState(false);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const endpoint="/api/admin/sale-readiness?product="+encodeURIComponent(product.id);

  useEffect(()=>{
    if(!dialog.current?.open)dialog.current?.showModal();
    const controller=new AbortController();
    (async()=>{
      const token=await user.getIdToken();
      const result=await fetch(endpoint,{signal:controller.signal,headers:{Authorization:"Bearer "+token}});
      if(!result.ok)throw Error();
      const data=await result.json();
      if(controller.signal.aborted)return;
      setFileName(data.fileName);setReference(data.reference);setActive(data.active);setCheckout(data.checkoutEnabled);setReady(true);
    })().catch(()=>{if(!controller.signal.aborted)setNotice("Kesiapan jual belum dapat dimuat.")});
    return ()=>controller.abort();
  },[endpoint,user]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!ready||busy)return;
    setBusy(true);setNotice("");
    try{
      const response=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+await user.getIdToken(),"Content-Type":"application/json"},body:JSON.stringify({fileName,reference,active,confirmed})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||"Perubahan gagal disimpan.");
      setNotice("Kesiapan jual disimpan.");
    }catch(error){setNotice(error instanceof Error?error.message:"Perubahan gagal disimpan.")}
    finally{setBusy(false)}
  }

  return <dialog ref={dialog} onClose={close} className="adminOrderDialog" aria-labelledby="sale-ready-title">
    <header className="adminDataToolbar"><h2 id="sale-ready-title">File &amp; penjualan</h2><form method="dialog"><button type="submit" className="button" autoFocus>Tutup</button></form></header>
    <div className="adminReportBody">
      <h3>{product.name}</h3>
      {notice&&<p role="status">{notice}</p>}
      {!ready&&!notice&&<p role="status">Memuat kesiapan jual…</p>}
      {ready&&<form className="buyerForm" onSubmit={save}>
        <p>Checkout situs {checkout?"aktif":"tertutup"}. File dikirim manual melalui email. Formulir ini hanya menyimpan catatan internal, tanpa mengunggah file.</p>
        <label>Nama ZIP<input className="control" maxLength={120} value={fileName} onChange={event=>setFileName(event.target.value)} placeholder="produk-v1.zip"/></label>
        <label>Referensi file privat<input className="control" maxLength={240} value={reference} onChange={event=>setReference(event.target.value)} placeholder="Contoh: folder rilis internal"/></label>
        <label className="adminSaleCheck"><input type="checkbox" checked={active} onChange={event=>setActive(event.target.checked)}/> Tandai siap jual</label>
        {active&&<label className="adminSaleCheck"><input type="checkbox" required checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/> Saya sudah memeriksa ZIP, lisensi, dan kesiapan pengiriman.</label>}
        <button className="button buttonPrimary" type="submit" disabled={busy}>{busy?"Menyimpan…":"Simpan kesiapan jual"}</button>
      </form>}
    </div>
  </dialog>;
}
