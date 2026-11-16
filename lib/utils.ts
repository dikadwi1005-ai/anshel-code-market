export function rupiah(value:number):string {
  return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
}
export function safePreviewPath(value:string|undefined|null):string {
  return /^\/previews\/[a-z0-9_-]+\.svg$/.test(value||"") ? value! : "/previews/website.svg";
}
export function errorMessage(error:unknown):string {
  if (typeof error==="object" && error && "code" in error){
    const code=String((error as {code?:string}).code);
    if(code==="permission-denied")return "Akses Firestore ditolak. Periksa akun admin dan Security Rules.";
    if(code==="auth/invalid-credential"||code==="auth/wrong-password")return "Email atau kata sandi tidak sesuai.";
    if(code==="auth/operation-not-allowed")return "Login Email/Password belum diaktifkan di Firebase.";
  }
  return error instanceof Error?error.message:"Terjadi gangguan, coba kembali.";
}
