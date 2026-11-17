import { createHmac, timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();

export function verifySumopodSignature(
  body: Uint8Array,
  headers: Headers,
  secret: string,
  now = Date.now(),
): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures || !/^\d{1,12}$/.test(timestamp)) return false;
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;

  const key = Buffer.from(secret.slice(6), "base64");
  if (key.length < 16) return false;
  const expected = createHmac("sha256", key)
    .update(encoder.encode(id + "." + timestamp + "."))
    .update(body)
    .digest();
  return signatures.split(/\s+/).some(signature => {
    if (!/^v1,[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
    const decoded = Buffer.from(signature.slice(3), "base64");
    return decoded.length === expected.length && timingSafeEqual(decoded, expected);
  });
}

type ExpectedPayment = { orderId: string; paymentId: string; amount: number };

export function matchesCompletedPayment(event: unknown, expected: ExpectedPayment): boolean {
  if (!event || typeof event !== "object" || !("event_type" in event) ||
      event.event_type !== "payment.completed" || !("data" in event) ||
      !event.data || typeof event.data !== "object") return false;
  const data = event.data as Record<string, unknown>;
  return Number.isSafeInteger(expected.amount) && expected.amount > 0 &&
    data.order_id === expected.orderId && data.payment_id === expected.paymentId &&
    data.amount === expected.amount && data.status === "completed" &&
    data.payment_method === "qris";
}
