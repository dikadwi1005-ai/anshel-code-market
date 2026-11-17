import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import DetailsClient from "@/components/details-client";
export const metadata = { title: "Detail Produk", robots: { index: false, follow: true } };
export default function ProductPage() {
  return <><SiteHeader/><main className="container page"><Suspense fallback={<div className="loading">Memuat produk…</div>}><DetailsClient/></Suspense></main><SiteFooter/></>;
}
