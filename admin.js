// Anshel Code Market administrator UI — Firebase Authentication + Firestore.
// No service account, privileged key, live payment, or ZIP delivery runs here.
// Firestore Security Rules MUST be installed before this UI is used.
const $ = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat("id-ID", {
  style: "currency", currency: "IDR", maximumFractionDigits: 0
}).format(Number(value) || 0);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g,
  c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const state = {
  client: null, admin: null, products: [], assets: [], orders: [],
  editingId: null, busy: false
};
const screens = ["busyScreen","setupScreen","loginScreen","dashboard"];
function showOnly(id) {
  for (const screen of screens) $(screen).hidden = screen !== id;
}
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.handle);
  toast.handle = setTimeout(() => el.classList.remove("visible"), 3800);
}
function explain(error) {
  const code = error?.code || "";
  if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(code))
    return "Email atau kata sandi admin tidak sesuai.";
  if (code === "permission-denied")
    return "Akses ditolak oleh Firestore. Periksa akun admin dan Security Rules.";
  if (code === "auth/operation-not-allowed")
    return "Login Email/Password belum diaktifkan pada Firebase Authentication.";
  return error instanceof Error ? error.message : String(error);
}
async function connect() {
  showOnly("busyScreen");
  try {
    const r = await fetch("/api/market-config", {
      cache: "no-store", signal: AbortSignal.timeout(11000)
    });
    const config = await r.json().catch(() => ({}));
    if (!r.ok || config.provider !== "firebase" || !config.configured ||
        !config.firebase?.projectId || !config.firebase?.apiKey)
      throw Error("Firebase khusus Anshel Market belum dikonfigurasi di Vercel.");
    const { openFirebase } = await import("./firebase-client.js");
    state.client = await openFirebase(config.firebase, { administrator: true });
    showOnly("loginScreen");
  } catch (error) {
    state.client = null;
    showOnly("setupScreen");
    toast(explain(error));
  }
}
async function login(event) {
  event.preventDefault();
  if (state.busy || !state.client) return;
  state.busy = true;
  $("loginButton").disabled = true;
  $("loginButton").textContent = "Memverifikasi…";
  try {
    const email = $("email").value.trim();
    const password = $("password").value;
    const user = await state.client.signIn(email, password);
    $("password").value = "";
    if (!(await state.client.isAdmin(user.uid))) {
      await state.client.signOut();
      throw Error("Akun ini belum memiliki hak admin. Minta akses melalui Firebase Console.");
    }
    state.admin = user;
    $("accountEmail").textContent = user.email || "Administrator";
    await reloadAll();
    showOnly("dashboard");
    toast("Data admin berhasil dimuat dari Firestore.");
  } catch (error) {
    await state.client.signOut().catch(() => {});
    state.admin = null;
    $("password").value = "";
    showOnly("loginScreen");
    toast(explain(error));
  } finally {
    state.busy = false;
    $("loginButton").disabled = false;
    $("loginButton").textContent = "Masuk";
  }
}
async function logout() {
  try { await state.client?.signOut(); } catch {}
  Object.assign(state, {
    admin: null, products: [], assets: [], orders: [], editingId: null
  });
  if ($("productDialog").open) $("productDialog").close();
  $("password").value = "";
  showOnly("loginScreen");
  toast("Sesi admin ditutup.");
}
function requireAdmin() {
  if (!state.admin || !state.client) throw Error("Silakan masuk sebagai admin.");
}
async function reloadAll() {
  requireAdmin();
  const [products, assets, orders] = await Promise.all([
    state.client.listProducts(), state.client.listAssets(), state.client.listOrders()
  ]);
  state.products = products;
  state.assets = assets;
  state.orders = orders;
  renderStats(); renderProducts(); renderOrders();
}
function renderStats() {
  $("totalProducts").textContent = state.products.length;
  $("draftProducts").textContent =
    state.products.filter(p => p.status === "draft").length;
  $("publishedProducts").textContent =
    state.products.filter(p => ["preview","published"].includes(p.status)).length;
  $("totalOrders").textContent = state.orders.length;
}
function renderProducts() {
  const search = $("productSearch").value.trim().toLocaleLowerCase("id");
  const status = $("statusFilter").value;
  const found = state.products.filter(p =>
    (!status || p.status === status) &&
    [p.name,p.category,p.stack,p.slug].join(" ").toLocaleLowerCase("id").includes(search)
  );
  $("productRows").innerHTML = found.length ? found.map(p => {
    const asset = state.assets.find(a => a.product_id === p.id);
    return '<tr><td><strong>'+escapeHTML(p.name)+'</strong><small>'+
      escapeHTML(p.category)+' · '+escapeHTML(p.stack)+'</small></td>'+
      '<td>'+fmt(p.price_idr)+'</td>'+
      '<td><span class="status '+escapeHTML(p.status)+'">'+
      (p.status==="preview"?"Pratinjau publik":p.status==="published"?"Terbit":escapeHTML(p.status))+
      '</span></td>'+
      '<td>'+(asset?'<span class="status published">Arsip tercatat</span>':
                    '<span class="status">Belum tersedia</span>')+'</td>'+
      '<td><div class="row-actions"><button type="button" data-edit="'+
      escapeHTML(p.id)+'">Edit</button>'+
      (["draft","preview"].includes(p.status) ?
        '<button type="button" data-visibility="'+escapeHTML(p.id)+'">'+
        (p.status==="preview"?"Sembunyikan":"Tampilkan di website")+'</button>' : '')+
      (p.status !== "archived" ? '<button type="button" data-archive="'+
      escapeHTML(p.id)+'">Arsipkan</button>' : '')+'</div></td></tr>';
  }).join("") : '<tr><td colspan="5" class="empty-row">Belum ada produk yang cocok.</td></tr>';
}
function renderOrders() {
  $("orderRows").innerHTML = state.orders.length ? state.orders.slice(0,50).map(o=>{
    const item = state.products.find(p => p.id === o.product_id);
    const date = o.created_at ? new Date(o.created_at).toLocaleString("id-ID") : "—";
    return '<tr><td><strong>'+escapeHTML(String(o.id).slice(0,8))+'</strong></td>'+
      '<td>'+escapeHTML(item?.name || "Produk")+'</td>'+
      '<td>'+fmt(o.amount_idr)+'</td>'+
      '<td><span class="status">'+escapeHTML(o.status || "pending")+'</span></td>'+
      '<td>'+escapeHTML(date)+'</td></tr>';
  }).join("") :
    '<tr><td colspan="5" class="empty-row">Belum ada pesanan. Pembayaran Mandiri belum diaktifkan.</td></tr>';
}
function setSection(section) {
  $("productsSection").hidden = section !== "products";
  $("ordersSection").hidden = section !== "orders";
  document.querySelectorAll("[data-section]").forEach(btn=>{
    const active = btn.dataset.section === section;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
function field(name) { return $("productForm").elements.namedItem(name); }
function openEditor(product = null) {
  state.editingId = product?.id || null;
  $("productForm").reset();
  for (const name of [
    "name","slug","category","stack","description",
    "preview_path","license_summary","status"
  ]) {
    if (product && product[name] !== undefined) field(name).value = product[name];
  }
  field("price_idr").value = product?.price_idr ?? 0;
  field("features").value = Array.isArray(product?.features)
    ? product.features.join("\n") : "";
  $("editorHeading").textContent = product ? "Edit produk" : "Tambah produk";
  $("zipUploader").hidden = !product;
  $("zipStatus").textContent = "Belum ada ZIP privat. Firebase Storage memerlukan paket Blaze.";
  $("productDialog").showModal();
}
function closeEditor() {
  if ($("productDialog").open) $("productDialog").close();
}
function getFormData() {
  const obj = {
    name: field("name").value.trim(),
    slug: field("slug").value.trim(),
    category: field("category").value.trim(),
    stack: field("stack").value.trim(),
    description: field("description").value.trim(),
    price_idr: Number(field("price_idr").value),
    status: field("status").value,
    preview_path: field("preview_path").value.trim(),
    license_summary: field("license_summary").value.trim(),
    features: field("features").value.split("\n").map(s=>s.trim()).filter(Boolean)
  };
  if (obj.name.length < 3 || obj.name.length > 160 ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(obj.slug) ||
      obj.slug.length > 120 ||
      !Number.isSafeInteger(obj.price_idr) || obj.price_idr < 0 ||
      obj.price_idr > 1000000000)
    throw Error("Periksa nama, slug dan harga produk.");
  if (obj.category.length < 2 || obj.category.length > 60 ||
      obj.stack.length > 300 || obj.description.length > 5000 ||
      obj.license_summary.length > 10000 || obj.preview_path.length > 150)
    throw Error("Periksa panjang kategori, teknologi, deskripsi, lisensi, dan path pratinjau.");
  if (state.products.some(product => product.slug === obj.slug && product.id !== state.editingId))
    throw Error("Slug sudah dipakai produk lain.");
  if (!["draft","preview","archived"].includes(obj.status))
    throw Error("Penjualan belum aktif. Gunakan Pratinjau publik untuk menampilkan produk.");
  if (obj.features.length > 30)
    throw Error("Maksimum 30 fitur per produk.");
  if (obj.preview_path &&
      !/^\/previews\/[a-z0-9_-]+\.svg$/.test(obj.preview_path))
    throw Error("Preview hanya boleh berasal dari folder /previews/*.svg.");
  return obj;
}
async function saveProduct(event) {
  event.preventDefault();
  if (state.busy) return;
  state.busy = true;
  $("saveProduct").disabled = true;
  try {
    requireAdmin();
    const value = getFormData();
    await state.client.saveProduct(value, state.editingId);
    closeEditor();
    await reloadAll();
    toast(value.status==="preview"?"Produk pratinjau tampil di katalog publik.":"Perubahan produk tersimpan di Firestore.");
  } catch (error) {
    toast("Gagal menyimpan: "+explain(error));
  } finally {
    state.busy = false;
    $("saveProduct").disabled = false;
  }
}
async function toggleVisibility(id) {
  const product = state.products.find(p=>p.id===id);
  if (!product || !["draft","preview"].includes(product.status) || state.busy) return;
  state.busy = true;
  try {
    requireAdmin();
    const visible = product.status !== "preview";
    await state.client.setCatalogVisibility(id, visible);
    await reloadAll();
    toast(visible
      ? "Pratinjau produk sudah ditampilkan di website. Pembelian tetap nonaktif."
      : "Produk disembunyikan dari katalog publik.");
  } catch (error) {
    toast("Gagal mengubah tampilan: "+explain(error));
  } finally {
    state.busy = false;
  }
}
async function archiveProduct(id) {
  const product = state.products.find(p => p.id === id);
  if (!product || state.busy) return;
  if (!confirm('Arsipkan produk "'+product.name+'"?')) return;
  state.busy = true;
  try {
    requireAdmin();
    await state.client.archiveProduct(id);
    await reloadAll();
    toast("Produk diarsipkan.");
  } catch (error) {
    toast("Gagal mengarsipkan: "+explain(error));
  } finally {
    state.busy = false;
  }
}
async function importDrafts() {
  const previews = window.AnshelProducts || [];
  if (!previews.length || state.busy) return;
  if (!confirm("Impor enam konsep katalog sebagai draft Firestore? Tidak ada produk yang diterbitkan.")) return;
  state.busy = true;
  $("importDrafts").disabled = true;
  try {
    requireAdmin();
    const items = previews.map(p=>({
      name:p.name,
      slug:p.name.toLowerCase().normalize("NFKD")
        .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
      category:p.category,
      stack:p.stack,
      description:p.desc,
      price_idr:p.price,
      features:[...p.features],
      preview_path:"/previews/"+p.kind+".svg",
      license_summary:"",
      status:"draft"
    }));
    const count = await state.client.importDrafts(items);
    await reloadAll();
    toast(count ? count+" produk konsep ditambahkan sebagai draft." : "Semua konsep sudah ada di Firestore.");
  } catch (error) {
    toast("Impor gagal: "+explain(error));
  } finally {
    state.busy = false;
    $("importDrafts").disabled = false;
  }
}
$("retryConnection").addEventListener("click", connect);
$("loginForm").addEventListener("submit", login);
$("logoutButton").addEventListener("click", logout);
$("productSearch").addEventListener("input", renderProducts);
$("statusFilter").addEventListener("change", renderProducts);
$("newProduct").addEventListener("click", ()=>openEditor());
$("importDrafts").addEventListener("click", importDrafts);
$("reloadProducts").addEventListener("click", async()=>{
  try { await reloadAll(); toast("Produk dimuat ulang."); }
  catch (error) { toast(explain(error)); }
});
$("reloadOrders").addEventListener("click", async()=>{
  try { await reloadAll(); toast("Pesanan dimuat ulang."); }
  catch (error) { toast(explain(error)); }
});
document.querySelectorAll("[data-section]").forEach(btn=>
  btn.addEventListener("click", ()=>setSection(btn.dataset.section)));
$("productRows").addEventListener("click", event=>{
  const edit = event.target.closest("[data-edit]");
  const archive = event.target.closest("[data-archive]");
  const visibility = event.target.closest("[data-visibility]");
  if (edit) openEditor(state.products.find(p=>p.id===edit.dataset.edit));
  if (visibility) toggleVisibility(visibility.dataset.visibility);
  if (archive) archiveProduct(archive.dataset.archive);
});
$("closeEditor").addEventListener("click", closeEditor);
$("cancelEditor").addEventListener("click", closeEditor);
$("productForm").addEventListener("submit", saveProduct);
connect();
