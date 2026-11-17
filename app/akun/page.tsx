import CustomerAccount from "@/components/customer-account";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export const metadata = {title: "Akun pembeli", robots: {index: false, follow: false}};

export default function AccountPage() {
  return <><SiteHeader/><main className="container page"><CustomerAccount/></main><SiteFooter/></>;
}
