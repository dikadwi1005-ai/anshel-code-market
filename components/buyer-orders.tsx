"use client";

import {useEffect, useState} from "react";
import type {User} from "firebase/auth";
import {rupiah} from "@/lib/utils";

type Order = {id: string; amount: number; status: keyof typeof labels; fulfillment: string | null};
const labels = {pending: "Menunggu pembayaran", paid: "Lunas", expired: "Kedaluwarsa", failed: "Gagal"};

export default function BuyerOrders({user}: {user: User}) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      const token = await user.getIdToken();
      if (controller.signal.aborted) return;
      const response = await fetch("/api/orders", {
        headers: {Authorization: "Bearer " + token},
        signal: controller.signal,
      });
      if (!response.ok) throw Error("Orders unavailable");
      const result = await response.json();
      if (!controller.signal.aborted) setOrders(result.orders);
    })().catch(() => {if (!controller.signal.aborted) setError(true)});
    return () => controller.abort();
  }, [user, attempt]);

  return <section aria-label="Pesanan saya">
    <h2>Pesanan saya</h2>
    {error ? <>
      <p role="alert">Pesanan belum dapat dimuat.</p>
      <button className="button" type="button" onClick={() => {setError(false); setAttempt(value => value + 1)}}>Coba lagi</button>
    </> : orders === null ? <p role="status">Memuat pesanan…</p> : orders.length ? <ul>
      {orders.map(order => <li key={order.id}>
        <strong>{labels[order.status]}</strong> · {rupiah(order.amount)}
        <p>Nomor pesanan: {order.id}</p>
        {order.fulfillment === "sent" && <p>File sudah dikirim melalui email.</p>}
        {order.fulfillment === "awaiting_email" && <p>Menunggu pengiriman melalui email.</p>}
      </li>)}
    </ul> : <p>Belum ada pesanan.</p>}
  </section>;
}
