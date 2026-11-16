import {Suspense} from "react";import SiteHeader from "@/components/site-header";import SiteFooter from "@/components/site-footer";import CompareClient from "@/components/compare-client";
export const metadata={title:"Bandingkan Produk"};
export default function ComparePage(){return <><SiteHeader/><main className="container page"><Suspense fallback={<div className="loading">Memuat perbandingan…</div>}><CompareClient/></Suspense></main><SiteFooter/></>}
