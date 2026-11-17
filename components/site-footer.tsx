import Link from "next/link";

export default function SiteFooter() {
  return <footer className="marketFooter">
    <div className="container">
      <div className="marketFooterGrid">
        <div className="marketFooterBrand">
          <Link className="logo" href="/" aria-label="Anshel Market beranda">anshel<span>.</span>market</Link>
          <p>Katalog source code dan template digital.</p>
        </div>
        <nav aria-label="Jelajahi marketplace">
          <h2>Jelajahi</h2>
          <Link href="/">Katalog</Link>
          <Link href="/tersimpan">Tersimpan</Link>
        </nav>
        <nav aria-label="Informasi marketplace">
          <h2>Informasi</h2>
          <Link href="/tentang">Tentang Anshel</Link>
          <Link href="/kebijakan">Kebijakan &amp; lisensi</Link>
          <Link href="/mitra">Jual di Anshel <span>Segera hadir</span></Link>
        </nav>
      </div>
      <div className="marketFooterBottom">© {new Date().getFullYear()} Anshel Code Market</div>
    </div>
  </footer>;
}
