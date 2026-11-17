import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Anshel Market — Source Code", template: "%s | Anshel Market" },
  description: "Jelajahi source code dan template digital di Anshel Code Market.",
  openGraph: { type: "website", locale: "id_ID", siteName: "Anshel Code Market", title: "Anshel Code Market", description: "Jelajahi source code dan template digital." },
  twitter: { card: "summary", title: "Anshel Code Market", description: "Jelajahi source code dan template digital." },
  robots: { index: true, follow: true },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="id"><body>{children}</body></html>;
}
