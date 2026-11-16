"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function SiteHeader(){
  const path=usePathname();
  return <header className="siteHeader"><div className="container headerInner">
    <Link href="/" className="logo" aria-label="Anshel Market beranda">anshel<span>.</span>market</Link>
    <nav className="headerNav" aria-label="Navigasi utama">
      <Link href="/" aria-current={path==="/"?"page":undefined}>Katalog</Link>
      <Link href="/tersimpan" aria-current={path==="/tersimpan"?"page":undefined}>Tersimpan</Link>
      <Link href="/tentang" aria-current={path==="/tentang"?"page":undefined}>Tentang</Link>
    </nav>
    <div className="headerEnd"><Link className="outlineLink" href="/admin">Dashboard Admin</Link></div>
  </div></header>;
}
