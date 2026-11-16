"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import type {Auth} from "firebase/auth";
import type {Firestore} from "firebase/firestore";
import {authenticateAdmin,closeAdminSession,getAdminAuth,importConcepts,initializeMarket,loadMarketConfig,readAdminData,saveProduct,setProductStatus,type ProductInput} from "@/lib/firebase";
import {concepts} from "@/lib/seed";
import type {Product,Order} from "@/lib/types";
import {errorMessage,rupiah} from "@/lib/utils";
import AdminEditor from "./admin-editor";

type Mode="connecting"|"setup"|"login"|"ready";
export default function AdminConsole(){
 const [mode,setMode]=useState<Mode>("connecting");
 const [db,setDb]=useState<Firestore|null>(null);
 const [auth,setAuth]=useState<Auth|null>(null);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [adminEmail,setAdminEmail]=useState("");
 const [products,setProducts]=useState<Product[]>([]);
 const [orders,setOrders]=useState<Order[]>([]);
 const [assets,setAssets]=useState<{id:string,product_id:string}[]>([]);
 const [busy,setBusy]=useState(false);
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState("");
 const [tab,setTab]=useState<"products"|"orders">("products");
 const [editing,setEditing]=useState<{product:Product|null}|null>(null);
 const [message,setMessage]=useState("");
 const flash=(value:string)=>{setMessage(value)};
 useEffect(()=>{let active=true;(async()=>{
  try{const config=await loadMarketConfig();if(!config.configured||!config.firebase)throw Error("Firebase belum terhubung ke website.");
   const {app,db}=initializeMarket(config.firebase);const auth=getAdminAuth(app);
   if(active){setAuth(auth);setDb(db);setMode("login")}
  }catch(error){if(active){flash(errorMessage(error));setMode("setup")}}
 })();return()=>{active=false}},[]);
 const refresh=async(database:Firestore)=>{const data=await readAdminData(database);setProducts(data.products);setOrders(data.orders);setAssets(data.assets)};
 const login=async(event:FormEvent)=>{event.preventDefault();if(!db||!auth||busy)return;setBusy(true);flash("");
  try{const user=await authenticateAdmin(auth,db,email.trim(),password);setPassword("");await refresh(db);setAdminEmail(user);setMode("ready");flash("Login berhasil, data diambil dari Firestore.")}
  catch(error){setPassword("");flash(errorMessage(error))}finally{setBusy(false)}
 };
 const logout=async()=>{if(auth)await closeAdminSession(auth).catch(()=>{});setProducts([]);setOrders([]);setAssets([]);setAdminEmail("");setPassword("");setMode("login");flash("Sesi admin ditutup.")};
 const handleSave=async(form:ProductInput)=>{if(!db)return;setBusy(true);try{await saveProduct(db,form,editing?.product?.id);await refresh(db);setEditing(null);flash("Data produk tersimpan ke Firestore.")}
  catch(error){flash(errorMessage(error));throw error}finally{setBusy(false)}};
 const toggle=async(p:Product)=>{if(!db||busy)return;setBusy(true);try{await setProductStatus(db,p.id,p.status==="preview"?"draft":"preview");await refresh(db);flash(p.status==="preview"?"Produk disembunyikan.":"Pratinjau produk ditampilkan di website. Pembelian tetap nonaktif.")}
  catch(error){flash(errorMessage(error)+" Pastikan Firebase Security Rules terbaru sudah terpasang.")}finally{setBusy(false)}};
 const archive=async(p:Product)=>{if(!db||busy)return;if(!confirm(`Arsipkan produk "${p.name}"?`))return;setBusy(true);
  try{await setProductStatus(db,p.id,"archived");await refresh(db);flash("Produk diarsipkan.")}catch(error){flash(errorMessage(error))}finally{setBusy(false)}};
 const seed=async()=>{if(!db||busy)return;if(!confirm("Impor 6 konsep menjadi draft ke Firestore? Produk tidak otomatis ditampilkan."))return;
  setBusy(true);try{const items=concepts.map(({id,created_at,updated_at,...rest})=>({...rest,status:"draft" as const}));const added=await importConcepts(db,items);await refresh(db);flash(`${added} produk konsep ditambahkan sebagai draft.`)}catch(error){flash(errorMessage(error))}finally{setBusy(false)}};
 const rows=useMemo(()=>products.filter(p=>(!filter||p.status===filter)&&[p.name,p.slug,p.stack,p.category].join(" ").toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id"))),[products,filter,search]);
 if(mode==="connecting")return <div className="loading">Memeriksa konfigurasi Firebase…</div>;
 if(mode==="setup")return <section className="adminSignIn"><div className="adminLoginLogo">ANSHEL MARKET · FIREBASE</div><h1>Database belum terhubung.</h1><p>Dashboard Next.js siap, tetapi konfigurasi Firebase belum dapat dibaca. Periksa environment variables di Vercel dan pastikan proyek `anshelcode` digunakan.</p>{message&&<div className="adminToast" role="alert">{message}</div>}<button className="button" type="button" onClick={()=>location.reload()}>Periksa ulang</button></section>;
 if(mode==="login")return <section className="adminSignIn"><div className="adminLoginLogo">ANSHEL MARKET · ADMINISTRATION</div><h1>Masuk ke Dashboard</h1><p>Gunakan akun Firebase Authentication yang sudah diberikan hak admin. Formulir ini tidak menyediakan pendaftaran publik.</p><form onSubmit={login}><label className="field"><span className="fieldLabel">Email admin</span><input className="control" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="field"><span className="fieldLabel">Kata sandi</span><input className="control" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button type="submit" disabled={busy} className="button buttonPrimary">{busy?"Memeriksa…":"Masuk"}</button></form>{message&&<div className="adminToast" role="status">{message}</div>}<p>Sesi tersimpan sementara di memori dan tidak menjadi akses publik.</p></section>;
 return <><div className="adminHead"><div className="adminHeading"><span className="eyebrow">ANSHEL CODE MARKET</span><h1>Dashboard Admin</h1><p>Produk dan status berasal langsung dari Firebase Firestore.</p></div><div className="adminUser"><small>{adminEmail}</small><button className="button" type="button" onClick={logout}>Keluar</button></div></div>
  <div className="adminMetrics"><div className="adminMetric"><span>Total produk</span><strong>{products.length}</strong></div><div className="adminMetric"><span>Draft</span><strong>{products.filter(p=>p.status==="draft").length}</strong></div><div className="adminMetric"><span>Pratinjau publik</span><strong>{products.filter(p=>["preview","published"].includes(p.status)).length}</strong></div><div className="adminMetric"><span>Pesanan</span><strong>{orders.length}</strong></div></div>
  {message&&<div className="adminToast" role="status">{message}</div>}
  <div className="adminColumns"><aside className="adminMenu"><button type="button" aria-pressed={tab==="products"} onClick={()=>setTab("products")}>Produk</button><button type="button" aria-pressed={tab==="orders"} onClick={()=>setTab("orders")}>Pesanan</button><p>Hak admin diperiksa oleh Firebase Authentication dan Firestore Security Rules.</p></aside>
  <section className="adminMain">{tab==="products"?<><div className="adminMainTop"><div><h2>Kelola Produk</h2><p>Atur status Pratinjau publik agar produk tampil di website. Checkout dan ZIP tetap nonaktif.</p></div><div className="utilityBar"><button className="button" disabled={busy} onClick={seed}>Impor 6 draft konsep</button><button className="button buttonPrimary" onClick={()=>setEditing({product:null})}>Tambah produk</button></div></div>
  <div className="adminTools"><input className="control" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari produk, kategori, atau teknologi"/><select className="control" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Status produk"><option value="">Semua status</option><option value="draft">Draft</option><option value="preview">Pratinjau publik</option><option value="published">Terbit lama</option><option value="archived">Arsip</option></select><button className="button" disabled={busy} onClick={()=>db&&refresh(db).then(()=>flash("Data diperbarui.")).catch(e=>flash(errorMessage(e)))}>Muat ulang</button></div>
  <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Produk</th><th>Harga</th><th>Status</th><th>ZIP privat</th><th>Aksi</th></tr></thead><tbody>{rows.length?rows.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.category} · {p.stack}</small></td><td>{rupiah(p.price_idr)}</td><td><span className={p.status==="preview"?"tag tagGreen":"tag tagGray"}>{p.status==="preview"?"Pratinjau publik":p.status}</span></td><td><span className="tag tagGray">{assets.some(a=>a.product_id===p.id)?"Arsip tercatat":"Belum tersedia"}</span></td><td><div className="adminButtons"><button className="button buttonMini" type="button" onClick={()=>setEditing({product:p})}>Edit</button>{["draft","preview"].includes(p.status)&&<button type="button" className="button buttonMini" disabled={busy} onClick={()=>toggle(p)}>{p.status==="preview"?"Sembunyikan":"Tampilkan di website"}</button>}{p.status!=="archived"&&<button type="button" className="button buttonMini" disabled={busy} onClick={()=>archive(p)}>Arsipkan</button>}</div></td></tr>):<tr><td colSpan={5}>Belum ada produk yang cocok.</td></tr>}</tbody></table></div>
  </>:<><div className="adminMainTop"><div><h2>Daftar Pesanan</h2><p>Hanya baca. Pembuatan pesanan dan konfirmasi pembayaran belum aktif.</p></div><button className="button" onClick={()=>db&&refresh(db).catch(e=>flash(errorMessage(e)))}>Muat ulang</button></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>ID</th><th>Produk</th><th>Nominal</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>{orders.length?orders.map(o=><tr key={o.id}><td>{o.id.slice(0,8)}</td><td>{products.find(p=>p.id===o.product_id)?.name||"Produk"}</td><td>{rupiah(o.amount_idr)}</td><td>{o.status}</td><td>{o.created_at?new Date(o.created_at).toLocaleString("id-ID"):"—"}</td></tr>):<tr><td colSpan={5}>Belum ada pesanan. Checkout masih nonaktif.</td></tr>}</tbody></table></div></>}
  </section></div>
  {editing&&<AdminEditor product={editing.product} onClose={()=>{if(!busy)setEditing(null)}} onSave={handleSave} busy={busy}/>}
 </>;
}
