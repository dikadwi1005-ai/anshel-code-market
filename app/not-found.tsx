import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
export const metadata = { title: "Halaman tidak ditemukan", robots: { index: false, follow: false } };
export default function NotFound() {
  return <><SiteHeader/><main className="container page"><div className="emptyState"><h1>Halaman tidak ditemukan.</h1><p>Alamat yang kamu buka tidak ada atau sudah dipindahkan.</p><Link className="button" href="/">Kembali ke katalog</Link></div></main><SiteFooter/></>;
}
