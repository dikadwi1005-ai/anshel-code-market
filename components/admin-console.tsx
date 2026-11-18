"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import AdminCustomers from "./admin-customers";
import type {Auth} from "firebase/auth";
import type {Firestore} from "firebase/firestore";
import {authenticateAdmin,closeAdminSession,getAdminAuth,initializeMarket,loadMarketConfig,readAdminData,saveProduct,setProductStatus,type ProductInput} from "@/lib/firebase";
import type {Product,Order} from "@/lib/types";
import {errorMessage,rupiah} from "@/lib/utils";
import AdminEditor from "./admin-editor";

const icons = {
 overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
 products: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
 orders: "M6 4h12v16l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
 customers: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M12 7a3 3 0 11-6 0 3 3 0 016 0zM16 5a3 3 0 010 6M22 21v-2a4 4 0 00-3-4",
 settings: "M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4",
} as const;
const orderLabels: Record<string,string> = {paid:"Lunas",pending:"Menunggu",creating:"Sedang dibuat",expired:"Kedaluwarsa",failed:"Gagal"};
function AdminIcon({name}: {name:keyof typeof icons}) {
 return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]}/></svg>;
}

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
 const [tab,setTab]=useState<"overview"|"products"|"orders"|"customers"|"settings">("overview");
 const [orderFilter,setOrderFilter]=useState("");
 const [editing,setEditing]=useState<{product:Product|null}|null>(null);
 const [message,setMessage]=useState("");
 const flash=(value:string)=>{setMessage(value)};
 useEffect(()=>{let active=true;(async()=>{
  try{const config=await loadMarketConfig();if(!config.configured||!config.firebase)throw Error("Firebase belum terhubung ke website.");
   const {app,db}=initializeMarket(config.firebase);const auth=getAdminAuth(app);
   if(active){setAuth(auth);setDb(db);setMode("login")}
  }catch(error){if(active){flash(errorMessage(error));setMode("setup")}}
 })();return()=>{active=false}},[]);
 const finishDelivery=async(id:string)=>{
  if(!auth?.currentUser||!db||busy||!confirm("Tandai pesanan ini setelah file benar-benar dikirim melalui email?"))return;
  setBusy(true);
  try{
   const response=await fetch("/api/orders/fulfillment",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+await auth.currentUser.getIdToken()},body:JSON.stringify({id})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Status pengiriman gagal disimpan.");
   await refresh(db);flash("Pengiriman ditandai selesai.");
  }catch(error){flash(errorMessage(error))}finally{setBusy(false)}
 };
 const refresh=async(database:Firestore)=>{const data=await readAdminData(database);setProducts(data.products);setOrders(data.orders);setAssets(data.assets)};
 const login=async(event:FormEvent)=>{event.preventDefault();if(!db||!auth||busy)return;setBusy(true);flash("");
  try{const user=await authenticateAdmin(auth,db,email.trim(),password);setPassword("");await refresh(db);setAdminEmail(user);setMode("ready");flash("")}
  catch(error){setPassword("");flash(errorMessage(error))}finally{setBusy(false)}
 };
 const logout=async()=>{if(auth)await closeAdminSession(auth).catch(()=>{});setProducts([]);setOrders([]);setAssets([]);setAdminEmail("");setPassword("");setMode("login");flash("Sesi admin ditutup.")};
 const handleSave=async(form:ProductInput)=>{if(!db)return;setBusy(true);try{await saveProduct(db,form,editing?.product?.id);await refresh(db);setEditing(null);flash("Data produk tersimpan ke Firestore.")}
  catch(error){flash(errorMessage(error));throw error}finally{setBusy(false)}};
 const toggle=async(p:Product)=>{if(!db||busy)return;setBusy(true);try{await setProductStatus(db,p.id,p.status==="preview"?"draft":"preview");await refresh(db);flash(p.status==="preview"?"Produk disembunyikan.":"Pratinjau produk ditampilkan di website. Pembelian tetap nonaktif.")}
  catch(error){flash(errorMessage(error)+" Pastikan Firebase Security Rules terbaru sudah terpasang.")}finally{setBusy(false)}};
 const archive=async(p:Product)=>{if(!db||busy)return;if(!confirm(`Arsipkan produk "${p.name}"?`))return;setBusy(true);
  try{await setProductStatus(db,p.id,"archived");await refresh(db);flash("Produk diarsipkan.")}catch(error){flash(errorMessage(error))}finally{setBusy(false)}};
 const rows=useMemo(()=>products.filter(p=>(!filter||p.status===filter)&&[p.name,p.slug,p.stack,p.category].join(" ").toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id"))),[products,filter,search]);
 if(mode==="connecting")return <div className="loading">Memeriksa konfigurasi Firebase…</div>;
 if(mode==="setup")return <section className="adminSignIn"><div className="adminLoginLogo">ANSHEL MARKET · FIREBASE</div><h1>Database belum terhubung.</h1><p>Dashboard Next.js siap, tetapi konfigurasi Firebase belum dapat dibaca. Periksa environment variables di Vercel dan pastikan proyek `anshelcode` digunakan.</p>{message&&<div className="adminToast" role="alert">{message}</div>}<button className="button" type="button" onClick={()=>location.reload()}>Periksa ulang</button></section>;
 if(mode==="login")return <section className="adminSignIn"><div className="adminLoginLogo">ANSHEL MARKET · ADMINISTRATION</div><h1>Masuk ke Dashboard</h1><p>Gunakan akun Firebase Authentication yang sudah diberikan hak admin. Formulir ini tidak menyediakan pendaftaran publik.</p><form onSubmit={login}><label className="field"><span className="fieldLabel">Email admin</span><input className="control" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label className="field"><span className="fieldLabel">Kata sandi</span><input className="control" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button type="submit" disabled={busy} className="button buttonPrimary">{busy?"Memeriksa…":"Masuk"}</button></form>{message&&<div className="adminToast" role="status">{message}</div>}<p>Sesi tersimpan sementara di memori dan tidak menjadi akses publik.</p></section>;
 const publicCount=products.filter(product=>["preview","published"].includes(product.status)).length;
 const awaiting=orders.filter(order=>order.status==="paid" && order.fulfillment_status==="awaiting_email").length;
 const sent=orders.filter(order=>order.fulfillment_status==="sent").length;
 const refreshView=async()=>{if(!db||busy)return;setBusy(true);try{await refresh(db);flash("Data diperbarui.")}catch(error){flash(errorMessage(error))}finally{setBusy(false)}};
 const showingProducts=tab==="products";
 const recentOrders=[...orders].sort((a,b)=>(b.created_at||"").localeCompare(a.created_at||"")).slice(0,6);
 const drafts=products.filter(product=>product.status==="draft").length;
 const visibleOrders=orders.filter(order=>!orderFilter||(orderFilter==="delivery"?order.status==="paid"&&order.fulfillment_status==="awaiting_email":order.status===orderFilter));
 const sections={overview:"Ringkasan",products:"Produk",orders:"Pesanan",customers:"Pelanggan",settings:"Pengaturan"};
 const descriptions={overview:"Pantau kondisi katalog dan pesanan terbaru.",products:"Kelola produk, harga, dan visibilitas katalog.",orders:"Pantau pembayaran QRIS dan pengiriman file.",customers:"Lihat akun yang terdaftar melalui situs.",settings:"Lihat cara pembayaran, pengiriman, dan akses diatur."};
 const metrics=showingProducts
   ? [["Total produk", products.length], ["Tampil di katalog", publicCount], ["Draft", products.filter(product=>product.status==="draft").length]]
   : [["Pesanan dimuat", orders.length], ["Perlu dikirim", awaiting], ["File dikirim", sent]];
 return <div className="adminWorkspace">
   <aside className="adminSidebar">
     <div className="adminWordmark">anshel<span>.</span>market<small>Admin</small></div>
     <span className="adminNavLabel">Operasional</span>
     <nav aria-label="Navigasi admin">
       {(Object.keys(sections) as Array<keyof typeof sections>).map(key=><button key={key} type="button" aria-current={tab===key?"page":undefined} onClick={()=>setTab(key)}><span className="adminNavItem"><AdminIcon name={key}/>{sections[key]}</span>{key==="orders"&&awaiting>0&&<span className="adminNavBadge">{awaiting}</span>}</button>)}
     </nav>
   </aside>
   <main className="adminContent">
     <header className="adminTopbar">
       <span>Admin / {sections[tab]}</span>
       <div className="adminIdentity"><div className="adminProfile"><span className="adminAvatar" aria-hidden="true">{adminEmail.slice(0,2).toUpperCase()}</span><span><strong>Administrator</strong><small>{adminEmail}</small></span></div><button type="button" className="button" onClick={logout}>Keluar</button></div>
     </header>
     <div className="adminContentInner">
       <header className="adminSectionHead">
         <div><h1>{sections[tab]}</h1><p>{descriptions[tab]}</p></div>
         {showingProducts&&<button type="button" className="button buttonPrimary" onClick={()=>setEditing({product:null})}>Tambah produk</button>}
       </header>
       {(tab==="products"||tab==="orders")&&<dl className="adminSummary">
         {metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
       </dl>}
       {message&&<p className="adminToast" role="status">{message}</p>}
       {tab==="overview"&&<>
         <dl className="adminSummary adminOverviewMetrics">
           <div><AdminIcon name="products"/><dt>Produk publik</dt><dd>{publicCount}</dd><small>{products.length} produk tercatat</small></div>
           <div><AdminIcon name="orders"/><dt>Pesanan terbaru</dt><dd>{orders.length}</dd><small>Dari daftar yang dimuat</small></div>
           <div><AdminIcon name="customers"/><dt>Siap dikirim</dt><dd>{awaiting}</dd><small>Pesanan lunas yang menunggu file</small></div>
         </dl>
         <div className="adminOverview">
           <section className="adminDataPanel">
             <div className="adminDataToolbar adminOverviewToolbar"><div><h2>Pesanan terbaru</h2><p>Pembayaran dan pengiriman</p></div><button type="button" className="button" onClick={()=>{setOrderFilter("");setTab("orders")}}>Lihat pesanan</button></div>
             {recentOrders.length ? <div className="adminTableWrap"><table className="adminTable adminRecentTable">
               <thead><tr><th scope="col">Produk</th><th scope="col">Nominal</th><th scope="col">Status</th></tr></thead>
               <tbody>{recentOrders.map(order=><tr key={order.id}>
                 <td><strong>{products.find(product=>product.id===order.product_id)?.name||"Produk"}</strong><small>{order.id.slice(0,8)}</small></td>
                 <td>{rupiah(order.amount_idr)}</td><td><span className={order.status==="paid"?"tag tagGreen":"tag tagGray"}>{orderLabels[order.status]||order.status}</span></td>
               </tr>)}</tbody>
             </table></div> : <div className="adminDataEmpty adminRecentEmpty"><div className="adminEmptyIcon"><AdminIcon name="orders"/></div><h3>Belum ada pesanan</h3><p>Pesanan pertama akan muncul di sini setelah pembeli memulai checkout.</p></div>}
           </section>
           <div className="adminOverviewRail">
             <section className="adminDataPanel adminRailPanel">
               <h2>Antrean pengiriman</h2>
               <p>{awaiting?awaiting+" pesanan sudah lunas dan menunggu file.":"Tidak ada pesanan yang menunggu file."}</p>
               <button className="adminActionLink" type="button" onClick={()=>{setOrderFilter("delivery");setTab("orders")}}>Buka antrean <span aria-hidden="true">→</span></button>
             </section>
             <section className="adminDataPanel adminRailPanel">
               <h2>Kondisi katalog</h2>
               <dl className="adminCatalogSplit"><div><dt>Publik</dt><dd>{publicCount}</dd></div><div><dt>Draft</dt><dd>{drafts}</dd></div><div><dt>Arsip</dt><dd>{products.filter(product=>product.status==="archived").length}</dd></div></dl>
               <button className="adminActionLink" type="button" onClick={()=>{setFilter("draft");setTab("products")}}>Tinjau draft <span aria-hidden="true">→</span></button>
             </section>
           </div>
         </div>
       </>}
       {tab==="customers"&&auth?.currentUser&&<AdminCustomers user={auth.currentUser}/>}
       {tab==="settings"&&<section className="adminDataPanel">
         <div className="adminDataToolbar"><h2>Konfigurasi operasional</h2></div>
         <dl className="adminSettingsList">
           <div><dt>Pembayaran</dt><dd>QRIS melalui SumoPod. Aktivasi checkout dikelola di konfigurasi server.</dd></div>
           <div><dt>Pengiriman</dt><dd>Admin mengirim file secara manual melalui email, lalu memperbarui status di Pesanan.</dd></div>
           <div><dt>Akun pembeli</dt><dd>Email dan kata sandi atau Google. Checkout mensyaratkan email terverifikasi.</dd></div>
           <div><dt>Akses admin</dt><dd>{adminEmail}. Hak akses dikelola melalui Firebase.</dd></div>
         </dl>
       </section>}
       {(tab==="products"||tab==="orders")&&<section className="adminDataPanel" aria-label={showingProducts?"Daftar produk":"Daftar pesanan"}>
         <div className="adminDataToolbar">
           {showingProducts ? <>
             <input className="control" type="search" aria-label="Cari produk" placeholder="Cari produk…" value={search} onChange={e=>setSearch(e.target.value)}/>
             <select className="control" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Status produk">
               <option value="">Semua status</option><option value="draft">Draft</option><option value="preview">Pratinjau publik</option><option value="published">Terbit lama</option><option value="archived">Arsip</option>
             </select>
           </> : <><h2>Daftar pesanan</h2><select className="control" aria-label="Status pesanan" value={orderFilter} onChange={event=>setOrderFilter(event.target.value)}><option value="">Semua pesanan</option><option value="pending">Menunggu pembayaran</option><option value="paid">Lunas</option><option value="delivery">Perlu dikirim</option><option value="failed">Gagal</option><option value="expired">Kedaluwarsa</option></select></>}
           <button type="button" className="button" disabled={busy} onClick={refreshView}>Muat ulang</button>
         </div>
         {showingProducts ? rows.length ? <div className="adminTableWrap"><table className="adminTable">
           <thead><tr><th scope="col">Produk</th><th scope="col">Harga</th><th scope="col">Status</th><th scope="col">File privat</th><th scope="col">Aksi</th></tr></thead>
           <tbody>{rows.map(product=><tr key={product.id}>
             <td><strong>{product.name}</strong><small>{product.category} · {product.stack}</small></td>
             <td>{rupiah(product.price_idr)}</td>
             <td><span className={["preview","published"].includes(product.status)?"tag tagGreen":"tag tagGray"}>{{draft:"Draft", preview:"Pratinjau publik", published:"Terbit lama", archived:"Arsip"}[product.status]}</span></td>
             <td>{assets.some(asset=>asset.product_id===product.id)?"Tercatat":"Belum tersedia"}</td>
             <td><div className="adminButtons">
               <button type="button" className="button buttonMini" onClick={()=>setEditing({product})}>Edit</button>
               {["draft","preview"].includes(product.status)&&<button type="button" className="button buttonMini" disabled={busy} onClick={()=>toggle(product)}>{product.status==="preview"?"Sembunyikan":"Tampilkan di website"}</button>}
               {product.status!=="archived"&&<button type="button" className="button buttonMini" disabled={busy} onClick={()=>archive(product)}>Arsipkan</button>}
             </div></td>
           </tr>)}</tbody>
         </table></div> : <div className="adminDataEmpty"><h2>{products.length?"Produk tidak ditemukan":"Belum ada produk"}</h2><p>{products.length?"Coba kata kunci atau status lain.":"Klik Tambah produk untuk mulai menyiapkan katalog."}</p></div>
         : visibleOrders.length ? <div className="adminTableWrap"><table className="adminTable">
           <thead><tr><th scope="col">Pesanan</th><th scope="col">Pembeli</th><th scope="col">Nominal</th><th scope="col">Pembayaran</th><th scope="col">Pengiriman</th></tr></thead>
           <tbody>{visibleOrders.map(order=><tr key={order.id}>
             <td><strong>{products.find(product=>product.id===order.product_id)?.name||"Produk"}</strong><small>{order.id.slice(0,8)} · {order.created_at?new Date(order.created_at).toLocaleString("id-ID"):"—"}</small></td>
             <td>{order.buyer_email||"—"}</td><td>{rupiah(order.amount_idr)}</td>
             <td><span className={order.status==="paid"?"tag tagGreen":"tag tagGray"}>{orderLabels[order.status]||order.status}</span></td>
             <td>{order.fulfillment_status==="sent"?"Sudah dikirim":order.status==="paid"&&order.fulfillment_status==="awaiting_email"?<div className="adminDelivery"><span>Menunggu pengiriman</span><button className="button buttonMini" type="button" disabled={busy} onClick={()=>finishDelivery(order.id)}>Tandai sudah dikirim</button></div>:"—"}</td>
           </tr>)}</tbody>
         </table></div> : <div className="adminDataEmpty"><h2>{orders.length?"Tidak ada pesanan dengan status ini":"Belum ada pesanan"}</h2><p>{orders.length?"Pilih filter lain untuk melihat pesanan.":"Pesanan akan muncul setelah pembeli memulai checkout. Setelah lunas, kirim file ke email pembeli lalu tandai pengiriman selesai di sini."}</p></div>}
       </section>}
     </div>
   </main>
   {editing&&<AdminEditor product={editing.product} onClose={()=>{if(!busy)setEditing(null)}} onSave={handleSave} busy={busy}/>}
 </div>;
}
