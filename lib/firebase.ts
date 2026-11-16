"use client";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, query, where, limit, addDoc, updateDoc, serverTimestamp, type Firestore, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { initializeAuth, signInWithEmailAndPassword, signOut, inMemoryPersistence, type Auth } from "firebase/auth";
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
export async function getPublicProducts(db:Firestore):Promise<Product[]> {
  // Requests must be constrained: Firestore rules are not filters.
  const results=await Promise.allSettled(["preview","published"].map(async status=>{
    const snap=await getDocs(query(collection(db,"market_products"),where("status","==",status),limit(24)));
    return snap.docs.map(row=>normalizeDocument<Product>(row));
  }));
  const preview=results[0];
  if(preview.status==="rejected")throw preview.reason;
  const rows=results.flatMap(result=>result.status==="fulfilled"?result.value:[]);
  return [...new Map(rows.map(row=>[row.id,row])).values()].sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))).slice(0,24);
}
export function getAdminAuth(app:FirebaseApp):Auth {
  // Admin session is deliberately memory-only, as in the previous site.
  adminAuth ||= initializeAuth(app,{persistence:inMemoryPersistence});
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
export async function importConcepts(db:Firestore,items:ProductInput[]):Promise<number>{
  const existing=await getDocs(collection(db,"market_products"));
  const slugs=new Set(existing.docs.map(row=>row.data().slug));
  let added=0;
  for(const p of items){if(slugs.has(p.slug))continue;
    await addDoc(collection(db,"market_products"),{...p,status:"draft",created_at:serverTimestamp(),updated_at:serverTimestamp()});
    slugs.add(p.slug);added++;}
  return added;
}
export async function closeAdminSession(auth:Auth){await signOut(auth);}
