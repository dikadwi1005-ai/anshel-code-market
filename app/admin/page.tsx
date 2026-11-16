import SiteHeader from "@/components/site-header";
import AdminConsole from "@/components/admin-console";
export const metadata={title:"Dashboard Admin",robots:{index:false,follow:false}};
export default function AdminPage(){return <div className="adminBody"><SiteHeader/><main className="container adminArea"><AdminConsole/></main></div>}
