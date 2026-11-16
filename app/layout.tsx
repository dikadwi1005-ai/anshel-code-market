import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Anshel Market — Source Code", template: "%s | Anshel Market" },
  description: "Katalog pratinjau produk digital Anshel Code Market. Pembelian dan pengiriman berkas belum aktif.",
  robots: { index: true, follow: true },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="id"><body>{children}</body></html>;
}
