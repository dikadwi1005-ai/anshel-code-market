"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { DAY_MS, wibDay, type FinanceReport } from "@/lib/finance";
import { rupiah } from "@/lib/utils";

const chartCurrency = new Intl.NumberFormat("id-ID", {
  notation: "compact", maximumFractionDigits: 1,
});
const paidDate = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short",
});
const shortDate = new Intl.DateTimeFormat("id-ID", {
  timeZone: "UTC", day: "numeric", month: "short",
});

function lastDays(count: number) {
  const now = Date.now();
  return { from: wibDay(now - (count - 1) * DAY_MS), to: wibDay(now) };
}

function financeUrl(range: { from: string; to: string }, download = false) {
  return "/api/admin/finance?" + new URLSearchParams({ ...range, ...(download ? { format: "csv" } : {}) });
}

function PaymentChart({ days }: { days: FinanceReport["days"] }) {
  const maximum = Math.max(...days.map(day => day.gross));
  const ceiling = Math.ceil(maximum / 4) * 4;
  const step = 620 / days.length;
  const labels = new Set([0, Math.round((days.length - 1) / 2), days.length - 1]);
  return <div className="financeChart">
    <svg viewBox="0 0 720 205" role="img" aria-label="Grafik nominal pembayaran lunas per hari">
      {[0, 1, 2, 3, 4].map(index => {
        const y = 169 - index * 37;
        return <g key={index}><line x1="66" y1={y} x2="700" y2={y} />
          <text x="57" y={y + 4} textAnchor="end">{chartCurrency.format(index * ceiling / 4)}</text></g>;
      })}
      {days.map((day, index) => {
        const x = 72 + index * step;
        const barWidth = Math.min(38, Math.max(1, step * .64));
        const height = maximum > 0 ? 148 * day.gross / ceiling : 0;
        return <g key={day.date}>
          {height > 0 && <rect x={x + (step - barWidth) / 2} y={169 - height} width={barWidth} height={height} rx="2">
            <title>{day.date}: {rupiah(day.gross)}</title>
          </rect>}
          {labels.has(index) && <text x={x + step / 2} y="193" textAnchor={index === 0 ? "start" : index === days.length - 1 ? "end" : "middle"}>
            {shortDate.format(new Date(day.date + "T00:00:00Z"))}
          </text>}
        </g>;
      })}
    </svg>
    <details>
      <summary>Rincian harian</summary>
      <div className="adminTableWrap" role="region" tabIndex={0} aria-label="Rincian pembayaran harian">
        <table className="adminTable financeDaily">
          <thead><tr><th scope="col">Tanggal (WIB)</th><th scope="col">Pembayaran</th><th scope="col">Nominal</th></tr></thead>
          <tbody>{days.map(day => <tr key={day.date}>
            <td>{shortDate.format(new Date(day.date + "T00:00:00Z"))}</td><td>{day.payments}</td><td>{rupiah(day.gross)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </div>;
}

export default function AdminFinance({ user, open, compact = false }: { user: User; open?: () => void; compact?: boolean }) {
  const [range, setRange] = useState(() => lastDays(30));
  const [input, setInput] = useState(range);
  const [preset, setPreset] = useState("30");
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [state, setState] = useState<"loading" | "complete" | "error">("loading");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function fetchReport() {
      setState("loading");
      try {
        const token = await user.getIdToken();
        const response = await fetch(financeUrl(range), {
          headers: { Authorization: "Bearer " + token }, signal: controller.signal, cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Data keuangan belum tersedia.");
        if (!controller.signal.aborted) {
          setReport(payload);
          setState("complete");
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Data keuangan belum tersedia.");
          setState("error");
        }
      }
    }
    void fetchReport();
    return () => controller.abort();
  }, [range, user, revision]);

  function changePreset(value: string) {
    setPreset(value);
    if (value === "custom") return;
    const next = lastDays(Number(value));
    setInput(next);
    setReport(null);
    setState("loading");
    setRange(next);
  }

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReport(null);
    setState("loading");
    setRange({ ...input });
  }

  async function download() {
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(financeUrl(range, true), {
        headers: { Authorization: "Bearer " + await user.getIdToken() }, cache: "no-store",
      });
      if (!response.ok) throw new Error("CSV belum dapat diunduh. Coba lagi.");
      const link = document.createElement("a");
      const url = URL.createObjectURL(await response.blob());
      link.href = url;
      link.download = `anshel-keuangan-${range.from}-${range.to}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError("CSV belum dapat diunduh. Coba lagi.");
    } finally {
      setDownloading(false);
    }
  }

  const totals = report?.totals;
  const chargesComplete = totals?.missing === 0;
  const metrics = totals ? [
    { label: "Pembayaran lunas", value: rupiah(totals.gross), caption: totals.payments + " transaksi QRIS live" },
    { label: "Biaya QRIS tercatat", value: totals.missing === totals.payments && totals.payments ? "—" : rupiah(totals.recordedFee), caption: chargesComplete ? "" : totals.missing + " transaksi belum punya rincian" },
    { label: "Neto setelah biaya", value: totals.missing === totals.payments && totals.payments ? "—" : rupiah(totals.recordedNet), caption: chargesComplete ? "" : "Hanya transaksi dengan biaya tercatat" },
  ] : [];
  const retry = () => { setState("loading"); setRevision(value => value + 1); };

  return <div className={compact ? "financeCompact" : "financeWorkspace"}>
    <section className="adminDataPanel financeSummary">
      <div className="financeToolbar">
        <div><h2>Pembayaran QRIS</h2><p>Live · Tanggal pembayaran dalam WIB</p></div>
        {compact ? <button type="button" className="button" onClick={open}>Buka Keuangan</button> :
          <div className="financeActions">
            <label className="financeField"><span>Periode</span>
              <select className="control" value={preset} onChange={event => changePreset(event.target.value)}>
                <option value="7">7 hari terakhir</option>
                <option value="30">30 hari terakhir</option>
                <option value="custom">Tanggal pilihan</option>
              </select>
            </label>
            <button className="button" type="button" onClick={download}
              disabled={downloading || state !== "complete" || !totals?.payments}>{downloading ? "Mengunduh…" : "Unduh CSV"}</button>
          </div>}
      </div>
      {!compact && preset === "custom" && <form className="financeRange" onSubmit={applyRange}>
        <label className="financeField"><span>Dari</span><input className="control" type="date" name="from" value={input.from} max={input.to}
          required onChange={event => setInput({ ...input, from: event.target.value })} /></label>
        <label className="financeField"><span>Sampai</span><input className="control" type="date" name="to" value={input.to} min={input.from}
          max={wibDay(Date.now())} required onChange={event => setInput({ ...input, to: event.target.value })} /></label>
        <button type="submit" className="button">Terapkan</button>
      </form>}
      {downloadError && <p className="financeNotice" role="alert">{downloadError}</p>}
      {state === "loading" && <p className="financeNotice" role="status">Memuat pembayaran…</p>}
      {state === "error" && <div className="financeNotice" role="status">{error} <button className="button" onClick={retry} type="button">Coba lagi</button></div>}
      {state === "complete" && totals && <>
        <dl className="financeMetrics">
          {metrics.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>
            {item.caption && <small>{item.caption}</small>}</div>)}
        </dl>
        {!compact && (totals.payments && report ? <PaymentChart days={report.days} /> :
          <p className="financeNotice">Belum ada pembayaran QRIS live yang lunas pada periode ini.</p>)}
        {compact && <p className="financeFootnote">30 hari terakhir</p>}
      </>}
    </section>
    {!compact && <>
      <section className="adminDataPanel financeLedger">
        <div className="financeToolbar"><div><h2>Transaksi lunas</h2><p>Maksimal 30 terbaru dalam periode terpilih.</p></div></div>
        {state === "complete" && report && (report.rows.length ? <div className="adminTableWrap" tabIndex={0} role="region" aria-label="Tabel transaksi lunas">
          <table className="adminTable financeTransactions">
            <thead><tr><th scope="col">Pesanan</th><th scope="col">Dibayar (WIB)</th><th scope="col">Nominal</th><th scope="col">Biaya</th><th scope="col">Neto</th></tr></thead>
            <tbody>{report.rows.map(row => <tr key={row.id}><td><span className="financeReference">{row.id}</span></td><td>{paidDate.format(new Date(row.date))}</td>
              <td>{rupiah(row.gross)}</td><td>{row.fee === null ? "—" : rupiah(row.fee)}</td><td>{row.net === null ? "—" : rupiah(row.net)}</td></tr>)}</tbody>
          </table>
        </div> : <p className="financeNotice">Transaksi pertama akan muncul setelah pembayaran dikonfirmasi.</p>)}
      </section>
      <p className="financeFootnote">Saldo tersedia, pencairan, dan refund dikelola melalui SumoPod Managed Payment. Neto di sini hanya mengurangi biaya QRIS yang tercatat.</p>
    </>}
  </div>;
}
