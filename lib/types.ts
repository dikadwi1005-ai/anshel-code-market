export type ProductStatus = "draft" | "preview" | "published" | "archived";
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  stack: string;
  description: string;
  price_idr: number;
  status: ProductStatus;
  features: string[];
  preview_path: string;
  license_summary: string;
  created_at?: string;
  updated_at?: string;
};
export type Order = { id:string; product_id:string; amount_idr:number; status:string; created_at?:string };
export type FirebaseWebConfig = { apiKey:string; authDomain:string; projectId:string; appId:string };
export type MarketConfig = { provider:"firebase"; configured:boolean; firebase?:FirebaseWebConfig; storageEnabled:boolean; paymentsEnabled:boolean; ordersEnabled:boolean };
