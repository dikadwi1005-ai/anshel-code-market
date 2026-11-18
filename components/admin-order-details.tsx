"use client";

import {useEffect,useRef} from "react";
import type {Order} from "@/lib/types";
import {rupiah} from "@/lib/utils";

const labels: Record<string,string> = {paid:"Lunas", pending:"Menunggu pembayaran", creating:"Sedang dibuat", expired:"Kedaluwarsa", failed:"Gagal", awaiting_email:"Menunggu email", sent:"Sudah dikirim"};

export default function AdminOrderDetails({order,product,close}: {order:Order; product?:string; close:()=>void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal()},[]);
  const time = (value?:string) => value ? new Date(value).toLocaleString("id-ID") : "—";
  return <dialog ref={ref} onClose={close} aria-labelledby="admin-order-heading" className="adminOrderDialog">
    <header className="adminDataToolbar">
      <h2 id="admin-order-heading">Detail pesanan</h2>
      <form method="dialog"><button className="button" type="submit" autoFocus>Tutup</button></form>
    </header>
    <dl className="adminSettingsList">
      <div><dt>Nomor pesanan</dt><dd>{order.id}</dd></div>
      <div><dt>Produk</dt><dd>{product||order.product_id}</dd></div>
      <div><dt>Email pembeli</dt><dd>{order.buyer_email||"—"}</dd></div>
      <div><dt>Nominal</dt><dd>{rupiah(order.amount_idr)}</dd></div>
      <div><dt>Pembayaran</dt><dd>{labels[order.status]||order.status}</dd></div>
      <div><dt>Pengiriman</dt><dd>{labels[order.fulfillment_status||""]||"—"}</dd></div>
      <div><dt>Pesanan dibuat</dt><dd>{time(order.created_at)}</dd></div>
      <div><dt>Waktu lunas</dt><dd>{time(order.paid_at)}</dd></div>
      <div><dt>File ditandai dikirim</dt><dd>{time(order.fulfilled_at)}</dd></div>
      {order.fulfilled_by&&<div><dt>Dicatat oleh</dt><dd>{order.fulfilled_by}</dd></div>}
    </dl>
  </dialog>;
}
