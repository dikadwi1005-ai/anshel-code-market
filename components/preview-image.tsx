import Image from "next/image";
import { safePreviewPath } from "@/lib/utils";

export default function PreviewImage({src,name,large=false}:{src:string;name:string;large?:boolean}){
  return <div className={large?"previewFrame previewFrameLarge":"previewFrame"}>
    <Image className="previewImage" alt={`Pratinjau ${name}`} src={safePreviewPath(src)} width={1200} height={780} unoptimized priority={large}/>
  </div>;
}
