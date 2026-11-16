"use client";
import {useEffect, useState} from "react";
import {initializeMarket, loadMarketConfig, subscribePublicProducts} from "./firebase";
import type {Product} from "./types";

export function usePublicProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [mode, setMode] = useState<"loading" | "firestore" | "error">("loading");
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const fail = () => { if (active) { clearTimeout(timeout); setItems([]); setMode("error"); } };
    timeout = setTimeout(fail, 15000);
    (async () => {
      try {
        const config = await loadMarketConfig();
        if (!config.configured || !config.firebase) throw Error("Catalog unavailable");
        if (!active) return;
        const {db} = initializeMarket(config.firebase);
        unsubscribe = subscribePublicProducts(db, rows => {
          clearTimeout(timeout);
          if (active) { setItems(rows); setMode("firestore"); }
        }, fail);
      } catch { fail(); }
    })();
    return () => { active = false; clearTimeout(timeout); unsubscribe?.(); };
  }, []);
  return {items, mode, error: mode === "error" ? "Produk belum dapat dimuat. Silakan coba lagi nanti." : ""};
}
