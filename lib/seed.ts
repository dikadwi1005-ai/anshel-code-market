import type { Product } from "./types";

export const concepts: Product[] = [
  {id:"concept-1",slug:"company-profile-starter",name:"Company Profile Starter",category:"Website",stack:"HTML, CSS, JavaScript",description:"Konsep website perusahaan dengan halaman layanan, profil, dan kontak.",price_idr:399000,features:["Halaman beranda dan layanan","Struktur profil perusahaan","Tampilan responsif"],preview_path:"/previews/website.svg",status:"draft",license_summary:"Belum tersedia"},
  {id:"concept-2",slug:"business-dashboard-ui",name:"Business Dashboard UI",category:"Dashboard",stack:"React, Tailwind CSS",description:"Konsep dashboard operasional dengan ringkasan data dan navigasi.",price_idr:549000,features:["Ringkasan metrik","Visualisasi data","Navigasi modul"],preview_path:"/previews/dashboard.svg",status:"draft",license_summary:"Belum tersedia"},
  {id:"concept-3",slug:"ai-assistant-interface",name:"AI Assistant Interface",category:"AI Tools",stack:"Next.js, TypeScript",description:"Konsep antarmuka chat untuk asisten AI atau aplikasi internal.",price_idr:699000,features:["Tampilan percakapan","Daftar sesi","Area input pesan"],preview_path:"/previews/assistant.svg",status:"draft",license_summary:"Belum tersedia"},
  {id:"concept-4",slug:"team-task-board",name:"Team Task Board",category:"Dashboard",stack:"React, JavaScript",description:"Konsep pengelolaan tugas untuk tim kecil dan pekerjaan harian.",price_idr:499000,features:["Daftar tugas","Status pekerjaan","Ringkasan tim"],preview_path:"/previews/operations.svg",status:"draft",license_summary:"Belum tersedia"},
  {id:"concept-5",slug:"booking-calendar",name:"Booking Calendar",category:"Website",stack:"HTML, CSS, JavaScript",description:"Konsep kalender reservasi untuk usaha jasa dan studio.",price_idr:449000,features:["Tampilan kalender","Pilihan tanggal","Alur reservasi"],preview_path:"/previews/booking.svg",status:"draft",license_summary:"Belum tersedia"},
  {id:"concept-6",slug:"creative-portfolio",name:"Creative Portfolio",category:"Website",stack:"HTML, CSS",description:"Konsep portofolio untuk freelancer dan studio kreatif.",price_idr:299000,features:["Galeri karya","Profil singkat","Halaman kontak"],preview_path:"/previews/portfolio.svg",status:"draft",license_summary:"Belum tersedia"},
];
export const categories = ["Website","Dashboard","AI Tools","Template","Lainnya"] as const;
export function findConcept(identifier:string|null){
  if (!identifier) return null;
  return concepts.find(p=>p.id===identifier||p.id===`concept-${identifier}`||p.slug===identifier)||null;
}
