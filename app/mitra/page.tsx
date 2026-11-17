import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export const metadata = {
  title: "Jual di Anshel",
  description: "Program mitra penjual Anshel Code Market segera hadir.",
  alternates: {canonical: "/mitra"},
};

export default function PartnerPage() {
  return <><SiteHeader/><main className="container page"><section className="article"><h1>Jual di Anshel</h1><p>Program mitra penjual segera hadir. Pendaftaran belum dibuka.</p></section></main><SiteFooter/></>;
}
