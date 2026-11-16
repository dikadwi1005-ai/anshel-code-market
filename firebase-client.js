// Firebase modular SDK adapter for Anshel Market.
// Pinned 13.3.0 CDN modules (verified against Firebase release notes 2026-11-11).
// A separate Firebase project is required; no privileged keys are used.
const APP_MODULE = "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
const FIRESTORE_MODULE = "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
const AUTH_MODULE = "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

export async function openFirebase(config, { administrator = false } = {}) {
  if (!config || !/^[a-z0-9-]+$/.test(config.projectId || "") ||
      !config.apiKey || !config.appId ||
      config.authDomain !== config.projectId + ".firebaseapp.com") {
    throw new Error("Konfigurasi Firebase tidak valid.");
  }

  const [appSdk, dbSdk] = await Promise.all([
    import(APP_MODULE),
    import(FIRESTORE_MODULE)
  ]);
  const app = appSdk.getApps().length
    ? appSdk.getApps()[0]
    : appSdk.initializeApp(config);
  const db = dbSdk.getFirestore(app);

  const mapDocument = item => {
    const data = item.data();
    const values = {};
    for (const [key, value] of Object.entries(data)) {
      values[key] = value && typeof value.toDate === "function"
        ? value.toDate().toISOString() : value;
    }
    return { ...values, id: item.id };
  };

  const client = {
    async listPublicCatalog() {
      // "preview" means publicly visible but NOT available for purchase.
      // Request status explicitly: Firestore security rules are not filters.
      const statuses = ["preview", "published"];
      const outcomes = await Promise.allSettled(statuses.map(async status => {
        const query = dbSdk.query(
          dbSdk.collection(db, "market_products"),
          dbSdk.where("status", "==", status),
          dbSdk.limit(24)
        );
        return (await dbSdk.getDocs(query)).docs.map(mapDocument);
      }));
      const [previews, published] = outcomes;
      // During rules rollout, retain backward-compatible reads of any
      // already-visible published records. Never allow drafts as a fallback.
      if (previews.status === "rejected" && published.status === "rejected")
        throw previews.reason;
      const rows = outcomes.flatMap(result =>
        result.status === "fulfilled" ? result.value : []);
      return [...new Map(rows.map(item => [item.id, item])).values()]
        .sort((a, b) =>
          String(b.created_at || "").localeCompare(String(a.created_at || "")))
        .slice(0, 24);
    },
    async listPublished() {
      return (await this.listPublicCatalog())
        .filter(item => item.status === "published");
    }
  };
  if (!administrator) return client;

  const authSdk = await import(AUTH_MODULE);
  const auth = authSdk.initializeAuth(app, {
    persistence: authSdk.inMemoryPersistence
  });
  return {
    ...client,
    async signIn(email, password) {
      const result = await authSdk.signInWithEmailAndPassword(auth, email, password);
      return { uid: result.user.uid, email: result.user.email };
    },
    async signOut() {
      await authSdk.signOut(auth);
    },
    async isAdmin(uid) {
      if (!uid || auth.currentUser?.uid !== uid) return false;
      const item = await dbSdk.getDoc(dbSdk.doc(db, "market_admins", uid));
      return item.exists();
    },
    async listProducts() {
      const items = await dbSdk.getDocs(dbSdk.collection(db, "market_products"));
      return items.docs.map(mapDocument)
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    },
    async listAssets() {
      const items = await dbSdk.getDocs(dbSdk.collection(db, "market_assets"));
      return items.docs.map(mapDocument);
    },
    async listOrders() {
      const items = await dbSdk.getDocs(
        dbSdk.query(dbSdk.collection(db, "market_orders"), dbSdk.limit(50))
      );
      return items.docs.map(mapDocument)
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    },
    async saveProduct(product, id = null) {
      if (id) {
        await dbSdk.updateDoc(dbSdk.doc(db, "market_products", id), {
          ...product, updated_at: dbSdk.serverTimestamp()
        });
        return id;
      }
      const result = await dbSdk.addDoc(dbSdk.collection(db, "market_products"), {
        ...product, created_at: dbSdk.serverTimestamp(),
        updated_at: dbSdk.serverTimestamp()
      });
      return result.id;
    },
    async setCatalogVisibility(id, visible) {
      await dbSdk.updateDoc(dbSdk.doc(db, "market_products", id), {
        status: visible ? "preview" : "draft",
        updated_at: dbSdk.serverTimestamp()
      });
    },
    async archiveProduct(id) {
      await dbSdk.updateDoc(dbSdk.doc(db, "market_products", id), {
        status: "archived", updated_at: dbSdk.serverTimestamp()
      });
    },
    async importDrafts(items) {
      // Never mutate existing slugs. Only explicitly requested admin imports.
      const previous = await dbSdk.getDocs(dbSdk.collection(db, "market_products"));
      const slugs = new Set(previous.docs.map(row => row.data().slug));
      let added = 0;
      for (const item of items) {
        if (slugs.has(item.slug)) continue;
        const { status, ...draft } = item;
        await dbSdk.addDoc(dbSdk.collection(db, "market_products"), {
          ...draft, status: "draft",
          created_at: dbSdk.serverTimestamp(), updated_at: dbSdk.serverTimestamp()
        });
        slugs.add(item.slug);
        added++;
      }
      return added;
    }
  };
}
