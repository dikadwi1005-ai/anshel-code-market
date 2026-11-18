"use client";

import {useEffect, useState} from "react";
import type {User} from "firebase/auth";

type Customer = {id: string; email: string; verified: boolean; disabled: boolean; created: string};

export default function AdminCustomers({user}: {user: User}) {
  const [page, setPage] = useState<string[]>([]);
  const [result, setResult] = useState<{customers: Customer[]; next: string | null} | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const cursor = page.at(-1);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/customers" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""), {
        signal: controller.signal, headers: {Authorization: "Bearer " + token},
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      if (!controller.signal.aborted) setResult(body);
    })().catch(() => {if (!controller.signal.aborted) setError("Daftar pelanggan belum dapat dimuat.")});
    return () => controller.abort();
  }, [user, cursor, attempt]);

  function load(next: string[]) {
    setResult(null);
    setError("");
    setPage(next);
    setAttempt(value => value + 1);
  }

  return <section className="adminDataPanel" aria-label="Daftar pelanggan">
    <div className="adminDataToolbar"><h2>Daftar pelanggan</h2><button type="button" className="button" onClick={() => load(page)}>Muat ulang</button></div>
    {error ? <p className="adminDataEmpty" role="alert">{error}</p> : !result ? <p className="adminDataEmpty" role="status">Memuat pelanggan…</p> : <>
      {result.customers.length ? <div className="adminTableWrap"><table className="adminTable">
        <thead><tr><th scope="col">Email</th><th scope="col">Status akun</th><th scope="col">Terdaftar</th></tr></thead>
        <tbody>{result.customers.map(item => <tr key={item.id}><td>{item.email}</td><td>{item.disabled ? "Nonaktif" : item.verified ? "Terverifikasi" : "Belum terverifikasi"}</td><td>{item.created ? new Date(item.created).toLocaleDateString("id-ID") : "—"}</td></tr>)}</tbody>
      </table></div> : <p className="adminDataEmpty">Tidak ada akun pembeli pada halaman ini.</p>}
      {(page.length>0 || result.next) && <div className="adminDataToolbar">
        {page.length>0 && <button type="button" className="button" onClick={() => load(page.slice(0,-1))}>Sebelumnya</button>}
        {result.next && <button type="button" className="button" onClick={() => load([...page,result.next!])}>Selanjutnya</button>}
      </div>}
    </>}
  </section>;
}
