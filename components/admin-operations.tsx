"use client";

import {useEffect, useState} from "react";
import type {User} from "firebase/auth";

type Status = {firebase: boolean; sumopodMode: "live" | "sandbox" | null; apiKeyConfigured: boolean; webhookConfigured: boolean; checkoutEnabled: boolean};

export default function AdminOperations({user}: {user: User}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  useEffect(()=>{
    const controller = new AbortController();
    (async()=>{
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/operations", {signal:controller.signal, headers:{Authorization:"Bearer "+token}});
      if (!response.ok) throw Error();
      const data = await response.json();
      if (!controller.signal.aborted) setStatus(data);
    })().catch(()=>{if(!controller.signal.aborted)setError(true)});
    return ()=>controller.abort();
  },[attempt,user]);
  function reload(){setError(false);setStatus(null);setAttempt(value=>value+1)}
  return <section className="adminDataPanel">
    <div className="adminDataToolbar"><h2>Status integrasi</h2><button type="button" className="button" onClick={reload}>Periksa ulang</button></div>
    {error?<p className="adminDataEmpty" role="alert">Status belum dapat dimuat.</p>:!status?<p className="adminDataEmpty" role="status">Memeriksa konfigurasi server…</p>:<dl className="adminSettingsList">
      <div><dt>Firebase</dt><dd>{status.firebase?"Akses baca server terverifikasi":"Belum terhubung"}</dd></div>
      <div><dt>SumoPod</dt><dd>{status.sumopodMode??"Mode belum dipilih"} · API key {status.apiKeyConfigured?"tersimpan":"belum tersimpan"}</dd></div>
      <div><dt>Webhook</dt><dd>{status.webhookConfigured?"Signing secret tersimpan":"Signing secret belum tersimpan"}</dd></div>
      <div><dt>Checkout publik</dt><dd>{status.checkoutEnabled?"Aktif":"Tertutup"} · Sakelar dikelola di Vercel.</dd></div>
      <div><dt>Pengiriman</dt><dd>Admin mengirim file lewat email dan memperbarui status di Pesanan.</dd></div>
      <div><dt>Akun pembeli</dt><dd>Email dan kata sandi atau Google. Checkout memerlukan email terverifikasi.</dd></div>
    </dl>}
  </section>;
}
