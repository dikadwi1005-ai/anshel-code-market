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
      // The rules require a public status filter and at most 24 results per query.
      const products = dbSdk.collection(db, "market_products");
      const filters = [
        dbSdk.where("status", "in", ["preview", "published"]),
        dbSdk.orderBy(dbSdk.documentId()),
        dbSdk.limit(24)
      ];
      const rows = [];
      let cursor;
      let snapshot;
      do {
        const query = dbSdk.query(products, ...filters,
          ...(cursor ? [dbSdk.startAfter(cursor)] : []));
        snapshot = await dbSdk.getDocsFromServer(query);
        rows.push(...snapshot.docs.map(mapDocument));
        cursor = snapshot.docs.at(-1);
      } while (snapshot.size === 24);
      return rows.sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")));
    },
    async findPublicProduct(slug) {
      if (!slug || slug.length > 120 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
      const query = dbSdk.query(
        dbSdk.collection(db, "market_products"),
        dbSdk.where("status", "in", ["preview", "published"]),
        dbSdk.where("slug", "==", slug),
        dbSdk.limit(1)
      );
      const result = await dbSdk.getDocsFromServer(query);
      return result.empty ? null : mapDocument(result.docs[0]);
    },
    async listPublished() {
      return (await this.listPublicCatalog()).filter(item => item.status === "published");
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
      // Existing drafts imported before stable IDs keep their original documents.
      const products = dbSdk.collection(db, "market_products");
      const previous = await dbSdk.getDocsFromServer(products);
      const existingSlugs = new Set(previous.docs.map(row => row.data().slug));
      const pending = items.filter(item => !existingSlugs.has(item.slug));
      if (!pending.length) return 0;
      const refs = pending.map(item => dbSdk.doc(products, "concept-" + item.slug));
      return dbSdk.runTransaction(db, async transaction => {
        const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
        let added = 0;
        for (const [index, item] of pending.entries()) {
          if (snapshots[index].exists()) continue;
          transaction.set(refs[index], {
            ...item, status: "draft",
            created_at: dbSdk.serverTimestamp(), updated_at: dbSdk.serverTimestamp()
          });
          added++;
        }
        return added;
      });
    }
  };
}
