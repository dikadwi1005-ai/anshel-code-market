import SiteHeader from "@/components/site-header";import SiteFooter from "@/components/site-footer";import SavedClient from "@/components/saved-client";
export const metadata={title:"Produk Tersimpan",robots:{index:false,follow:true}};
export default function SavedPage(){return <><SiteHeader/><main className="container page"><SavedClient/></main><SiteFooter/></>}
