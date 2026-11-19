export const DAY_MS = 86_400_000;
const WIB_MS = 7 * 3_600_000;

export type FinanceRow = {
  id: string;
  date: string;
  gross: number;
  fee: number | null;
  net: number | null;
};

export type FinanceReport = ReturnType<typeof summarizeFinance>;

export function wibRange(from: string | null, to: string | null) {
  function parse(value: string | null) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const utc = Date.parse(value + "T00:00:00Z");
    return Number.isFinite(utc) && new Date(utc).toISOString().slice(0, 10) === value ? utc - WIB_MS : null;
  }
  const start = parse(from);
  const end = parse(to);
  if (start === null || end === null || end < start || end - start >= 365 * DAY_MS) return null;
  return { start, endExclusive: end + DAY_MS };
}

export function wibDay(time: number) {
  return new Date(time + WIB_MS).toISOString().slice(0, 10);
}

export function validProviderAmounts(data: Record<string, unknown>, gross: number) {
  const { fee, net_amount: net } = data;
  return typeof fee === "number" && Number.isSafeInteger(fee) && fee >= 0 && fee <= gross &&
    typeof net === "number" && Number.isSafeInteger(net) && net === gross - fee
    ? { fee, net }
    : null;
}

export function providerPaidTime(value: unknown, now = Date.now()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  if (!wibRange(value.slice(0, 10), value.slice(0, 10))) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= now + 300_000 ? time : null;
}

export function financeOrder(id: string, row: Record<string, unknown>) {
  if (row.payment_mode !== "live" || row.status !== "paid" || row.currency !== "IDR" ||
      typeof row.amount_idr !== "number" || !Number.isSafeInteger(row.amount_idr) ||
      row.amount_idr <= 0 || row.amount_idr > 1_000_000_000 ||
      !(row.paid_at instanceof Date) || !Number.isFinite(row.paid_at.getTime())) return null;
  const charges = validProviderAmounts({ fee: row.provider_fee_idr, net_amount: row.provider_net_idr }, row.amount_idr);
  return { id, date: row.paid_at.toISOString(), gross: row.amount_idr, fee: charges?.fee ?? null, net: charges?.net ?? null };
}

export function summarizeFinance(rows: FinanceRow[], start: number, endExclusive: number) {
  const days = Array.from({ length: (endExclusive - start) / DAY_MS }, (_, index) => ({
    date: wibDay(start + index * DAY_MS),
    gross: 0,
    payments: 0,
  }));
  let gross = 0, recordedFee = 0, recordedNet = 0, missing = 0;
  for (const row of rows) {
    const index = Math.floor((Date.parse(row.date) - start) / DAY_MS);
    if (!days[index]) continue;
    days[index].gross += row.gross;
    days[index].payments++;
    gross += row.gross;
    if (row.fee === null || row.net === null) missing++;
    else {
      recordedFee += row.fee;
      recordedNet += row.net;
    }
  }
  return { totals: { gross, payments: rows.length, recordedFee, recordedNet, missing }, days, rows: rows.slice(0, 30) };
}
