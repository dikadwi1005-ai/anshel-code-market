"use client";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, onSnapshot, collection, doc, getDoc, getDocs, query, where, limit, addDoc, updateDoc, serverTimestamp, type Firestore, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { getAuth, initializeAuth, signInWithEmailAndPassword, signOut, inMemoryPersistence, type Auth } from "firebase/auth";
import type { FirebaseWebConfig, MarketConfig, Product, Order } from "./types";

let appInstance: FirebaseApp | undefined;
let adminAuth: Auth | undefined;
function initApp(c:FirebaseWebConfig):FirebaseApp {
  if(!/^[a-z0-9-]+$/.test(c.projectId)||!c.apiKey||!c.appId||c.authDomain!==c.projectId+".firebaseapp.com")throw Error("Konfigurasi Firebase tidak valid.");
  appInstance ||= getApps()[0] || initializeApp(c);
  return appInstance;
}
export async function loadMarketConfig():Promise<MarketConfig> {
  const response=await fetch("/api/market-config",{cache:"no-store"});
  if(!response.ok)throw Error("Konfigurasi marketplace tidak tersedia.");
  return await response.json() as MarketConfig;
}
export function initializeMarket(c:FirebaseWebConfig):{db:Firestore,app:FirebaseApp} {
  const app=initApp(c);return {db:getFirestore(app),app};
}
function normalizeDocument<T extends {id:string}>(snapshot:QueryDocumentSnapshot<DocumentData>):T {
  const row=snapshot.data();
  const values:Record<string,unknown>={};
  for(const [key,value] of Object.entries(row))values[key]=(value && typeof value==="object" && "toDate" in value && typeof value.toDate==="function")?value.toDate().toISOString():value;
  return {...values,id:snapshot.id} as T;
}
export function subscribePublicProducts(db:Firestore,onProducts:(products:Product[])=>void,onError:()=>void):()=>void {
  // Keep each query within the existing public Security Rules limit.
  const results=new Map<string,Product[]>();
  let failed=false;
  const emit=()=>{
    if(failed||results.size!==2)return;
    const rows=[...results.values()].flat();
    onProducts([...new Map(rows.map(row=>[row.id,row])).values()]
      .filter(row=>row.status==="preview"||row.status==="published")
      .sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))));
  };
  const subscriptions=["preview","published"].map(status=>onSnapshot(
    query(collection(db,"market_products"),where("status","==",status),limit(24)),
    {includeMetadataChanges:true},
    snapshot=>{if(snapshot.metadata.fromCache)return;results.set(status,snapshot.docs.map(row=>normalizeDocument<Product>(row)));emit()},
    error=>{
      // Older rules may permit preview only; other failures must remain visible.
      if(status==="published"&&error.code==="permission-denied"){results.set(status,[]);emit();return}
      failed=true;onError();
    }
  ));
  return()=>subscriptions.forEach(unsubscribe=>unsubscribe());
}
export function getAdminAuth(app:FirebaseApp):Auth {
  // Admin session is deliberately memory-only, as in the previous site.
  // initializeAuth melempar auth/already-initialized setelah Fast Refresh; pakai instance yang sudah ada.
  if(!adminAuth){try{adminAuth=initializeAuth(app,{persistence:inMemoryPersistence})}catch{adminAuth=getAuth(app)}}
  return adminAuth;
}
export async function authenticateAdmin(auth:Auth,db:Firestore,email:string,password:string):Promise<string>{
  const credential=await signInWithEmailAndPassword(auth,email,password);
  const result=await getDoc(doc(db,"market_admins",credential.user.uid));
  if(!result.exists()){
    await signOut(auth);
    throw Error("Akun tidak memiliki hak admin.");
  }
  return credential.user.email||email;
}
export async function readAdminData(db:Firestore):Promise<{products:Product[],orders:Order[],assets:{id:string,product_id:string}[]}> {
  const [products,orders,assets]=await Promise.all([
    getDocs(collection(db,"market_products")),
    getDocs(query(collection(db,"market_orders"),limit(50))),
    getDocs(collection(db,"market_assets")),
  ]);
  return {products:products.docs.map(row=>normalizeDocument<Product>(row)).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))),
    orders:orders.docs.map(row=>normalizeDocument<Order>(row)),assets:assets.docs.map(row=>normalizeDocument<{id:string,product_id:string}>(row))};
}
export type ProductInput=Omit<Product,"id"|"created_at"|"updated_at">;
export async function saveProduct(db:Firestore,form:ProductInput,id?:string){
  if(id){await updateDoc(doc(db,"market_products",id),{...form,updated_at:serverTimestamp()});return id;}
  const ref=await addDoc(collection(db,"market_products"),{...form,created_at:serverTimestamp(),updated_at:serverTimestamp()});return ref.id;
}
export async function setProductStatus(db:Firestore,id:string,status:"draft"|"preview"|"archived"){
  await updateDoc(doc(db,"market_products",id),{status,updated_at:serverTimestamp()});
}
export async function closeAdminSession(auth:Auth){await signOut(auth);}
