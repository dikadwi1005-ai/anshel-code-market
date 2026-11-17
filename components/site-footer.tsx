import Link from "next/link";
export default function SiteFooter(){return <footer className="siteFooter"><div className="container footerInner">
  <Link className="logo" href="/">anshel<span>.</span>market</Link>
  <div><Link href="/kebijakan">Kebijakan & lisensi</Link><Link href="/tentang">Tentang</Link><Link href="/mitra">Jual di Anshel</Link></div>
  <small>© {new Date().getFullYear()} Anshel Market</small>
</div></footer>}
