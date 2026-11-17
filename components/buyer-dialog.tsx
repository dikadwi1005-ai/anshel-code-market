"use client";

import {useEffect, useRef, useState} from "react";
import CustomerAccount from "./customer-account";

export default function BuyerDialog({productId}: {productId?: string}) {
  const dialog = useRef<HTMLDialogElement>(null);

  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (productId) return;
    const url = new URL(location.href);
    if (url.searchParams.get("masuk") !== "1") return;
    setOpened(true);
    dialog.current?.showModal();
    url.searchParams.delete("masuk");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }, [productId]);

  return <>
    <button type="button" className="button" aria-haspopup="dialog" onClick={() => { setOpened(true); dialog.current?.showModal(); }}>
      {productId ? "Lanjut ke pembayaran" : "Masuk"}
    </button>
    <dialog ref={dialog} className="buyerDialog" aria-label={productId ? "Akun dan pembayaran" : "Akun pembeli"}>
      <form method="dialog" className="buyerDialogClose">
        <button type="submit" autoFocus className="button" aria-label="Tutup pop-up">Tutup</button>
      </form>
      {opened && <CustomerAccount productId={productId} />}
    </dialog>
  </>;
}
