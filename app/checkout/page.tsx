import { Suspense } from "react";import SiteHeader from "@/components/site-header";import SiteFooter from "@/components/site-footer";import CheckoutClient from "@/components/checkout-client";
export const metadata={title:"Ringkasan Pembayaran",robots:{index:false,follow:true}};
export default function CheckoutPage(){return <><SiteHeader/><main className="container page"><Suspense fallback={<div className="loading">Memuat ringkasan…</div>}><CheckoutClient/></Suspense></main><SiteFooter/></>}
