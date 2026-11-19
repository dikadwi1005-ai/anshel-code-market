"use client";

import { useState } from "react";
import Image from "next/image";
import PreviewImage from "./preview-image";

type Shot = { src: string; label: string; width: number; height: number };

const ruangKerja = [
  { src: "/previews/ruang-kerja-saas.svg", label: "Dashboard", width: 1425, height: 702 },
  { src: "/previews/ruang-kerja-papan.jpg", label: "Papan tugas", width: 1265, height: 712 },
  { src: "/previews/ruang-kerja-role.jpg", label: "Role & izin", width: 1265, height: 712 },
  { src: "/previews/ruang-kerja-gelap.jpg", label: "Tema gelap", width: 1265, height: 712 },
] satisfies Shot[];

export default function ProductGallery({ cover, name }: { cover: string; name: string }) {
  const [active, setActive] = useState(0);
  if (cover !== ruangKerja[0].src) {
    return <div className="detailPreview">
      <PreviewImage src={cover} name={name} large />
      <div className="detailMeta">Pratinjau produk</div>
    </div>;
  }

  const shot = ruangKerja[active];
  return <section className="detailPreview releaseGallery" aria-label="Galeri produk">
    <figure>
      <div className="releaseGalleryImage">
        <Image src={shot.src} alt={name + " — " + shot.label} width={shot.width} height={shot.height}
          unoptimized loading="eager" />
      </div>
      <figcaption aria-live="polite">{shot.label} <span>{active + 1} / {ruangKerja.length}</span></figcaption>
    </figure>
    <div className="releaseGalleryChoices" role="group" aria-label="Pilih gambar pratinjau">
      {ruangKerja.map((option, index) => <button key={option.src} type="button"
        aria-pressed={index === active} onClick={() => setActive(index)}>
        <Image src={option.src} alt="" width={option.width} height={option.height} unoptimized />
        <span>{option.label}</span>
      </button>)}
    </div>
  </section>;
}
