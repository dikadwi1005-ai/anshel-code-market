"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BuyerDialog from "./buyer-dialog";
export default function SiteHeader(){
  const path=usePathname();
  return <header className="siteHeader marketHeader"><div className="container marketHeaderInner">
    <Link href="/" className="logo" aria-label="Anshel Market beranda">anshel<span>.</span>market</Link>
    <nav className="marketNav" aria-label="Navigasi utama">
      <Link href="/" aria-current={path==="/"?"page":undefined}>Katalog</Link>
      <Link href="/tersimpan" aria-current={path==="/tersimpan"?"page":undefined}>Tersimpan</Link>
    </nav>
    <div className="marketHeaderAccount"><BuyerDialog /></div>

  </div></header>;
}
