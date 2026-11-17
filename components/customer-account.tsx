"use client";

import {useEffect, useState} from "react";
import {browserPopupRedirectResolver, browserSessionPersistence, GoogleAuthProvider, initializeAuth, onAuthStateChanged, signInWithPopup, signOut, type Auth, type User} from "firebase/auth";
import {getApps, initializeApp} from "firebase/app";
import {loadMarketConfig} from "@/lib/firebase";

export default function CustomerAccount({productId}: {productId?: string}) {
  const [auth, setAuth] = useState<Auth>();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    loadMarketConfig().then(({configured, firebase}) => {
      if (!active) return;
      if (!configured || firebase?.projectId !== "anshelcode") throw Error();
      const name = "market-customer";
      const app = getApps().find(entry => entry.name === name) ?? initializeApp(firebase, name);
      const instance = initializeAuth(app, {persistence: browserSessionPersistence, popupRedirectResolver: browserPopupRedirectResolver});
      setAuth(instance);
      unsubscribe = onAuthStateChanged(instance, current => {
        setUser(current);
        setReady(true);
      });
    }).catch(() => {
      if (active) {
        setError("Layanan akun belum tersedia. Silakan coba lagi nanti.");
        setReady(true);
      }
    });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  async function changeSession() {
    if (!auth || busy) return;
    setBusy(true);
    setError("");
    try {
      if (user) await signOut(auth);
      else await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setError("Gagal mengubah sesi akun. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!user || !productId || paying) return;
    setPaying(true);
    setError("");
    try {
      const response = await fetch("/api/checkout?product=" + encodeURIComponent(productId), { method: "POST", headers: { Authorization: "Bearer " + await user.getIdToken() } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.url !== "string") throw Error(data.error || "Pembayaran belum dapat dibuat.");
      location.assign(data.url);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Pembayaran belum dapat dibuat.");
    } finally {
      setPaying(false);
    }
  }

  return <section className="article">
    <h1>Akun pembeli</h1>
    {user ? <p>{user.email}</p> : <p>Masuk dengan akun Google. Email terverifikasi dipakai untuk pengiriman pesanan.</p>}
    {productId && user && <button type="button" className="button buttonPrimary" disabled={paying} onClick={pay}>{paying ? "Menyiapkan pembayaran…" : "Bayar dengan QRIS"}</button>}
    {error && <p role="alert">{error}</p>}
    {!ready ? <p role="status">Memuat akun…</p> : auth && <button type="button" className="button buttonPrimary" disabled={busy} onClick={changeSession}>{busy ? "Memproses…" : user ? "Keluar" : "Masuk dengan Google"}</button>}
  </section>;
}
