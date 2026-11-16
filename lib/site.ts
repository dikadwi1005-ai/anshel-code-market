// Satu sumber untuk origin situs. Atur NEXT_PUBLIC_SITE_URL di Vercel bila domain berubah.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://anshel-code-market.vercel.app").replace(/\/$/, "");
