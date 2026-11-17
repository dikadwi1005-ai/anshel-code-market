"use client";

import {useEffect, useState, type FormEvent} from "react";
import {browserPopupRedirectResolver, browserSessionPersistence, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, reload, signInWithEmailAndPassword, GoogleAuthProvider, initializeAuth, onAuthStateChanged, signInWithPopup, signOut, type Auth, type User} from "firebase/auth";
import {getApps, initializeApp} from "firebase/app";
import {loadMarketConfig} from "@/lib/firebase";

export default function CustomerAccount({productId}: {productId?: string}) {
  const [auth, setAuth] = useState<Auth>();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
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
        setVerified(current?.emailVerified === true);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") || "").trim();
    const password = String(fields.get("password") || "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email).catch(error => {
          if (error?.code !== "auth/user-not-found") throw error;
        });
        setMessage("Jika email terdaftar, tautan reset akan dikirim.");
      } else if (mode === "register") {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(result.user);
        setMessage("Cek inbox untuk memverifikasi email.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch {
      setError(mode === "login" ? "Tidak bisa masuk. Periksa email dan kata sandi." : "Permintaan belum bisa diproses. Coba lagi nanti.");
    } finally { setBusy(false); }
  }

  async function verifyEmail(resend: boolean) {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (resend) {
        await sendEmailVerification(user);
        setMessage("Tautan verifikasi dikirim. Periksa inbox atau folder spam.");
      } else {
        await reload(user);
        await user.getIdToken(true);
        setVerified(user.emailVerified);
        setMessage(user.emailVerified ? "Email sudah terverifikasi." : "Email belum terverifikasi.");
      }
    } catch {
      setError("Verifikasi belum dapat diproses. Coba lagi nanti.");
    } finally { setBusy(false); }
  }

  async function pay() {
    if (!user || !verified || !productId || paying) return;
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

  const title = user ? "Akun pembeli" : mode === "register" ? "Buat akun" : mode === "reset" ? "Reset kata sandi" : "Masuk ke akun";
  function switchMode(next: typeof mode) {
    setMode(next);
    setError("");
    setMessage("");
  }

  return <section className="buyerAccount" aria-labelledby="buyer-account-title">
    <header className="buyerAccountHeader">
      <p>Anshel Market / Akun</p>
      <h1 id="buyer-account-title">{title}</h1>
      <p>{user ? user.email : mode === "reset" ? "Kami akan mengirim tautan reset ke email akun kamu." : "Gunakan email yang bisa kamu akses untuk menerima pesanan digital."}</p>
    </header>
    {!ready && <p role="status">Memuat akun…</p>}
    {error && <p className="buyerFeedback" role="alert">{error}</p>}
    {message && <p className="buyerFeedback" role="status">{message}</p>}
    {auth && ready && (user ? <div className="buyerActions">
      {!verified && <>
        <p>Verifikasi email sebelum melakukan pembayaran.</p>
        <button type="button" className="button" disabled={busy} onClick={() => verifyEmail(true)}>Kirim tautan verifikasi</button>
        <button type="button" className="button" disabled={busy} onClick={() => verifyEmail(false)}>Saya sudah verifikasi</button>
      </>}
      {productId && verified && <button type="button" className="button buttonPrimary" disabled={paying} onClick={pay}>{paying ? "Menyiapkan pembayaran…" : "Bayar dengan QRIS"}</button>}
      <button type="button" className="button" disabled={busy} onClick={changeSession}>Keluar</button>
    </div> : <>
      <form key={mode} className="buyerForm" onSubmit={submit}>
        <label>Email<input className="control" name="email" type="email" autoComplete="email" required /></label>
        {mode !== "reset" && <label>Kata sandi<input className="control" name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 6 : undefined} required /></label>}
        {mode === "login" && <button type="button" className="buyerTextButton" onClick={() => switchMode("reset")}>Lupa kata sandi?</button>}
        <button type="submit" className="button buttonPrimary" disabled={busy}>{busy ? "Memproses…" : mode === "reset" ? "Kirim tautan reset" : mode === "register" ? "Daftar" : "Masuk"}</button>
      </form>
      {mode === "login" && <>
        <div className="buyerDivider">atau</div>
        <button type="button" className="button buyerGoogle" disabled={busy} onClick={changeSession}>Lanjutkan dengan Google</button>
      </>}
      <p className="buyerSwitch">{mode === "login" ? "Belum punya akun? " : ""}<button type="button" className="buyerTextButton" onClick={() => switchMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Daftar" : "Kembali ke masuk"}</button></p>
    </>)}
  </section>;
}
