// Anshel Market administrator UI. Uses Supabase Auth + PostgREST with an
// exclusively PUBLISHABLE key. Session tokens are kept only in memory.
// Database RLS is the authorization boundary, not this browser UI.
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state={config:null,session:null,products:[],assets:[],orders:[],editingId:null,busy:false,refreshing:null};
const allSections=["busyScreen","setupScreen","loginScreen","dashboard"];
function showOnly(id){for(const key of allSections)$(key).hidden=key!==id}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("visible");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("visible"),3800)}
function explain(error){return error instanceof Error?error.message:String(error)}
async function parseResponse(res){
  const body=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(body?.message||body?.msg||body?.error_description||body?.error||"Permintaan gagal ("+res.status+").");
  return body;
}
async function authRequest(path,body){
  const res=await fetch(state.config.url+"/auth/v1/"+path,{
    method:"POST",headers:{"Content-Type":"application/json","apikey":state.config.publishableKey},
    body:JSON.stringify(body),cache:"no-store"
  });
  return parseResponse(res);
}
async function ensureSession(){
  if(!state.session)throw Error("Sesi berakhir. Silakan masuk kembali.");
  if(Date.now()<state.session.expiresAt-45000)return;
  if(!state.refreshing){
    state.refreshing=(async()=>{
      const next=await authRequest("token?grant_type=refresh_token",{refresh_token:state.session.refreshToken});
      state.session={accessToken:next.access_token,refreshToken:next.refresh_token,expiresAt:Date.now()+next.expires_in*1000,email:state.session.email};
    })().finally(()=>{state.refreshing=null});
  }
  await state.refreshing;
}
async function api(path,{method="GET",body=null,headers={}}={}){
  await ensureSession();
  const result=await fetch(state.config.url+path,{
    method,
    headers:{"apikey":state.config.publishableKey,"Authorization":"Bearer "+state.session.accessToken,
      ...(body!==null?{"Content-Type":"application/json"}:{}),...headers},
    body:body===null?undefined:JSON.stringify(body),
    cache:"no-store"
  });
  return parseResponse(result);
}
async function connect(){
  showOnly("busyScreen");
  try{
    const res=await fetch("/api/market-config",{cache:"no-store"});
    if(!res.ok)throw Error("Proyek Supabase belum dikonfigurasi pada Vercel.");
    const config=await parseResponse(res);
    if(!config.configured||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)||!config.publishableKey?.startsWith("sb_publishable_")){
      throw Error("Konfigurasi Supabase belum lengkap.");
    }
    state.config=config;
    showOnly("loginScreen");
  }catch(e){state.config=null;showOnly("setupScreen");toast(explain(e))}
}
async function enterDashboard(){
  const rows=await api("/rest/v1/market_admins?select=user_id&limit=1");
  if(!Array.isArray(rows)||rows.length===0){
    state.session=null;
    throw Error("Akun ini belum diberikan hak admin. Tidak ada akses produk.");
  }
  $("accountEmail").textContent=state.session.email;
  await reloadAll();
  showOnly("dashboard");
}
async function login(event){
  event.preventDefault();
  if(state.busy)return;
  state.busy=true;$("loginButton").disabled=true;$("loginButton").textContent="Memverifikasi…";
  try{
    const email=$("email").value.trim(),password=$("password").value;
    const res=await authRequest("token?grant_type=password",{email,password});
    $("password").value="";
    state.session={accessToken:res.access_token,refreshToken:res.refresh_token,
      expiresAt:Date.now()+res.expires_in*1000,email};
    await enterDashboard();
    toast("Dashboard terhubung ke Supabase.");
  }catch(e){state.session=null;$("password").value="";showOnly("loginScreen");toast(explain(e))}
  finally{state.busy=false;$("loginButton").disabled=false;$("loginButton").textContent="Masuk"}
}
async function logout(){
  if(state.session){
    try{await api("/auth/v1/logout",{method:"POST"})}catch{}
  }
  state.session=null;state.products=[];state.assets=[];state.orders=[];state.editingId=null;
  $("productDialog").close?.();$("password").value="";showOnly("loginScreen");toast("Sesi admin ditutup.");
}
async function reloadAll(){
  const [products,assets,orders]=await Promise.all([
    api("/rest/v1/market_products?select=*&order=created_at.desc"),
    api("/rest/v1/market_assets?select=*&order=uploaded_at.desc"),
    api("/rest/v1/market_orders?select=id,product_id,amount_idr,status,created_at&order=created_at.desc&limit=50")
  ]);
  state.products=Array.isArray(products)?products:[];
  state.assets=Array.isArray(assets)?assets:[];
  state.orders=Array.isArray(orders)?orders:[];
  renderStats();renderProducts();renderOrders();
}
function renderStats(){
  $("totalProducts").textContent=state.products.length;
  $("draftProducts").textContent=state.products.filter(p=>p.status==="draft").length;
  $("publishedProducts").textContent=state.products.filter(p=>p.status==="published").length;
  $("totalOrders").textContent=state.orders.length;
}
function renderProducts(){
  const query=$("productSearch").value.trim().toLocaleLowerCase("id");
  const status=$("statusFilter").value;
  const found=state.products.filter(p=>(!status||p.status===status)&&
     (p.name+" "+p.category+" "+p.stack+" "+p.slug).toLocaleLowerCase("id").includes(query));
  $("productRows").innerHTML=found.length?found.map(p=>{
    const uploaded=state.assets.find(a=>a.product_id===p.id);
    return '<tr><td><strong>'+escapeHTML(p.name)+'</strong><small>'+escapeHTML(p.category)+' · '+escapeHTML(p.stack)+'</small></td>'+
      '<td>'+fmt(p.price_idr)+'</td><td><span class="status '+escapeHTML(p.status)+'">'+escapeHTML(p.status)+'</span></td>'+
      '<td>'+(uploaded?'<span class="status published">ZIP privat tersedia</span><small>'+escapeHTML(uploaded.original_filename)+'</small>':'<span class="status">Belum diunggah</span>')+'</td>'+
      '<td><div class="row-actions"><button type="button" data-edit="'+p.id+'">Edit</button>'+
      (p.status!=="archived"?'<button type="button" data-archive="'+p.id+'">Arsipkan</button>':'')+'</div></td></tr>';
  }).join(""):'<tr><td colspan="5" class="empty-row">Belum ada produk yang cocok.</td></tr>';
}
function renderOrders(){
  const rows=state.orders.slice(0,50);
  $("orderRows").innerHTML=rows.length?rows.map(o=>{
    const p=state.products.find(item=>item.id===o.product_id);
    return '<tr><td><strong>'+escapeHTML(o.id.slice(0,8))+'</strong></td><td>'+escapeHTML(p?.name||"Produk")+'</td>'+
       '<td>'+fmt(o.amount_idr)+'</td><td><span class="status">'+escapeHTML(o.status)+'</span></td>'+
       '<td>'+escapeHTML(new Date(o.created_at).toLocaleString("id-ID"))+'</td></tr>';
  }).join(""):'<tr><td colspan="5" class="empty-row">Belum ada pesanan. Checkout transfer Mandiri masih dinonaktifkan.</td></tr>';
}
function setSection(which){
  $("productsSection").hidden=which!=="products";$("ordersSection").hidden=which!=="orders";
  document.querySelectorAll("[data-section]").forEach(btn=>{
    const on=btn.dataset.section===which;btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on));
  });
}
function field(name){return $("productForm").elements.namedItem(name)}
function openEditor(p=null){
  state.editingId=p?.id||null;$("productForm").reset();
  for(const name of ["name","slug","category","stack","description","preview_path","license_summary","status"]){
    if(p&&p[name]!==undefined)field(name).value=p[name];
  }
  field("price_idr").value=p?.price_idr??0;
  field("features").value=Array.isArray(p?.features)?p.features.join("\n"):"";
  $("editorHeading").textContent=p?"Edit produk":"Tambah produk";
  $("zipUploader").hidden=!p;
  const asset=p?state.assets.find(a=>a.product_id===p.id):null;
  $("zipStatus").textContent=asset?"ZIP tersimpan: "+asset.original_filename:"Belum ada ZIP privat untuk produk ini.";
  $("zipFile").value="";
  $("productDialog").showModal();
}
function closeEditor(){if($("productDialog").open)$("productDialog").close()}
async function saveProduct(event){
  event.preventDefault();if(state.busy)return;state.busy=true;$("saveProduct").disabled=true;
  try{
    const value={name:field("name").value.trim(),slug:field("slug").value.trim(),
      category:field("category").value,stack:field("stack").value.trim(),
      description:field("description").value.trim(),price_idr:Number(field("price_idr").value),
      status:field("status").value,preview_path:field("preview_path").value.trim(),
      license_summary:field("license_summary").value.trim(),
      features:field("features").value.split("\n").map(s=>s.trim()).filter(Boolean)};
    if(!value.name||!value.slug||!Number.isSafeInteger(value.price_idr)||value.price_idr<0)throw Error("Periksa nama, slug, dan nominal harga.");
    if(value.status==="published"){
      const hasZip=state.assets.some(a=>a.product_id===state.editingId);
      if(!hasZip||!value.license_summary||value.price_idr<=0)throw Error("Untuk menerbitkan produk, tambahkan ZIP privat, lisensi, dan harga final terlebih dahulu.");
    }
    const path=state.editingId?"/rest/v1/market_products?id=eq."+state.editingId:"/rest/v1/market_products";
    await api(path,{method:state.editingId?"PATCH":"POST",body:value,headers:{"Prefer":"return=representation"}});
    closeEditor();await reloadAll();toast("Perubahan produk tersimpan di Supabase.");
  }catch(e){toast("Gagal menyimpan: "+explain(e))}
  finally{state.busy=false;$("saveProduct").disabled=false}
}
async function archiveProduct(id){
  const p=state.products.find(item=>item.id===id);if(!p)return;
  if(!confirm('Arsipkan produk "'+p.name+'"? Produk yang diterbitkan akan berhenti tampil sebagai rilis.'))return;
  try{await api("/rest/v1/market_products?id=eq."+id,{method:"PATCH",body:{status:"archived"},headers:{"Prefer":"return=representation"}});
    await reloadAll();toast("Produk diarsipkan.");
  }catch(e){toast("Gagal mengarsipkan: "+explain(e))}
}
async function uploadZip(){
  const file=$("zipFile").files?.[0],id=state.editingId;
  if(!id){toast("Simpan produk lebih dulu.");return}
  if(!file||!file.name.toLowerCase().endsWith(".zip")){toast("Pilih arsip .zip yang sah.");return}
  if(file.size<=0||file.size>50*1024*1024){toast("Ukuran ZIP harus antara 1 byte dan 50 MB.");return}
  if(state.busy)return;
  state.busy=true;$("uploadZip").disabled=true;$("uploadZip").textContent="Mengunggah…";
  try{
    await ensureSession();
    const path=id+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,10)+".zip";
    const res=await fetch(state.config.url+"/storage/v1/object/anshel-source-packages/"+path,{
      method:"POST",headers:{"apikey":state.config.publishableKey,
      "Authorization":"Bearer "+state.session.accessToken,
      "Content-Type":"application/zip","x-upsert":"false"},body:file
    });
    await parseResponse(res);
    try{
      await api("/rest/v1/market_assets?on_conflict=product_id",{
        method:"POST",
        headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
        body:{product_id:id,object_path:path,original_filename:file.name,file_size_bytes:file.size}
      });
    }catch(e){throw Error("ZIP terunggah, tetapi metadata gagal disimpan; periksa bucket privat sebelum mencoba kembali. "+explain(e))}
    await reloadAll();$("zipStatus").textContent="ZIP tersimpan: "+file.name;$("zipFile").value="";
    toast("ZIP tersimpan pada Supabase Storage privat.");
  }catch(e){toast("Gagal mengunggah: "+explain(e))}
  finally{state.busy=false;$("uploadZip").disabled=false;$("uploadZip").textContent="Unggah ZIP"}
}
$("retryConnection").addEventListener("click",connect);
$("loginForm").addEventListener("submit",login);
$("logoutButton").addEventListener("click",logout);
$("productSearch").addEventListener("input",renderProducts);
$("statusFilter").addEventListener("change",renderProducts);
$("newProduct").addEventListener("click",()=>openEditor());
$("reloadProducts").addEventListener("click",async()=>{try{await reloadAll();toast("Data produk diperbarui.")}catch(e){toast(explain(e))}});
$("reloadOrders").addEventListener("click",async()=>{try{await reloadAll();toast("Daftar pesanan diperbarui.")}catch(e){toast(explain(e))}});
document.querySelectorAll("[data-section]").forEach(btn=>btn.addEventListener("click",()=>setSection(btn.dataset.section)));
$("productRows").addEventListener("click",e=>{
  const edit=e.target.closest("[data-edit]"),archive=e.target.closest("[data-archive]");
  if(edit)openEditor(state.products.find(p=>p.id===edit.dataset.edit));
  if(archive)archiveProduct(archive.dataset.archive);
});
$("closeEditor").addEventListener("click",closeEditor);
$("cancelEditor").addEventListener("click",closeEditor);
$("productForm").addEventListener("submit",saveProduct);
$("uploadZip").addEventListener("click",uploadZip);
connect();
