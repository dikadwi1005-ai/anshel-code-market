"use client";

import {useEffect,useState,type FormEvent} from "react";
import type {User} from "firebase/auth";
import {rupiah} from "@/lib/utils";

type Totals={orders:number;paid:number;gross:number;pending:number;expired:number;failed:number;creating:number;awaiting:number;sent:number};
type Event={id:string;action:string;actor?:string;reference?:string;active:boolean;date?:string};
type Result={totals?:Totals;events?:Event[];next?:string|null};
const actions:Record<string,string>={sale_readiness_updated:"Kesiapan jual diperbarui",order_fulfilled:"File ditandai sudah dikirim"};
function localDate(offset:number){
  return new Date(Date.now()+7*3600000+offset*86400000).toISOString().slice(0,10);
}

export default function AdminAnalytics({user,mode}:{user:User;mode:"reports"|"audit"}){
  const [from,setFrom]=useState(()=>localDate(-29));
  const [to,setTo]=useState(()=>localDate(0));
  const [range,setRange]=useState(()=>({from:localDate(-29),to:localDate(0)}));
  const [pages,setPages]=useState<string[]>([]);
  const [result,setResult]=useState<Result|null>(null);
  const [error,setError]=useState("");
  const [attempt,setAttempt]=useState(0);
  const after=pages.at(-1);
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({mode,...(mode==="reports"?range:after?{after}:{})});
    (async()=>{
      const token=await user.getIdToken();
      const response=await fetch("/api/admin/analytics?"+params,{signal:controller.signal,headers:{Authorization:"Bearer "+token}});
      const body=await response.json();
      if(!response.ok)throw Error(body.error||"Data belum dapat dimuat.");
      if(!controller.signal.aborted)setResult(body);
    })().catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:"Data belum dapat dimuat.")});
    return()=>controller.abort();
  },[user,mode,range,after,attempt]);
  function reload(){setResult(null);setError("");setAttempt(value=>value+1)}
  function apply(event:FormEvent<HTMLFormElement>){event.preventDefault();setRange({from,to});reload()}
  return <section className="adminDataPanel">
    <div className="adminDataToolbar"><h2>{mode==="reports"?"Penjualan dan pengiriman":"Riwayat tindakan admin"}</h2><button type="button" className="button" onClick={reload}>Muat ulang</button></div>
    {mode==="reports"&&<form className="adminDataToolbar adminAnalyticsFilters" onSubmit={apply}>
      <label>Dari<input type="date" className="control" value={from} onChange={event=>setFrom(event.target.value)} max={to} required/></label>
      <label>Sampai<input type="date" className="control" value={to} onChange={event=>setTo(event.target.value)} min={from} required/></label>
      <button type="submit" className="button buttonPrimary">Terapkan</button>
    </form>}
    {error?<p className="adminDataEmpty" role="alert">{error}</p>:!result?<p className="adminDataEmpty" role="status">Memuat data…</p>:result.totals?<div className="adminReportBody">
      <p>Pesanan yang dibuat {range.from} sampai {range.to} (WIB). Nominal lunas sebelum biaya SumoPod.</p>
      <dl className="adminSummary">
        <div><dt>Nominal lunas</dt><dd>{rupiah(result.totals.gross)}</dd></div>
        <div><dt>Pesanan lunas</dt><dd>{result.totals.paid}</dd></div>
        <div><dt>Pengiriman selesai</dt><dd>{result.totals.sent}</dd></div>
      </dl>
      <dl className="adminSettingsList">
        <div><dt>Semua pesanan</dt><dd>{result.totals.orders}</dd></div>
        <div><dt>Menunggu pembayaran</dt><dd>{result.totals.pending}</dd></div>
        <div><dt>Sedang dibuat</dt><dd>{result.totals.creating}</dd></div>
        <div><dt>Gagal / kedaluwarsa</dt><dd>{result.totals.failed} / {result.totals.expired}</dd></div>
        <div><dt>Menunggu pengiriman</dt><dd>{result.totals.awaiting}</dd></div>
      </dl>
    </div>:<>
      <div className="adminReportBody"><p>Catatan tersedia untuk perubahan kesiapan jual dan penandaan pengiriman. Tindakan lama yang belum dicatat tidak ditambahkan kembali.</p></div>
      {result.events?.length?<div className="adminTableWrap"><table className="adminTable">
        <thead><tr><th scope="col">Tindakan</th><th scope="col">Referensi</th><th scope="col">ID admin</th><th scope="col">Waktu (WIB)</th></tr></thead>
        <tbody>{result.events.map(event=><tr key={event.id}><td>{actions[event.action]||event.action}{event.action==="sale_readiness_updated"&&<small>{event.active?"Siap jual":"Tidak siap jual"}</small>}</td><td>{event.reference||"—"}</td><td>{event.actor||"—"}</td><td>{event.date?new Date(event.date).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"}):"—"}</td></tr>)}</tbody>
      </table></div>:<p className="adminDataEmpty">Belum ada tindakan tercatat.</p>}
      {(pages.length>0||result.next)&&<div className="adminDataToolbar">
        {pages.length>0&&<button type="button" className="button" onClick={()=>{setPages(pages.slice(0,-1));reload()}}>Sebelumnya</button>}
        {result.next&&<button type="button" className="button" onClick={()=>{setPages([...pages,result.next!]);reload()}}>Selanjutnya</button>}
      </div>}
    </>}
  </section>;
}
