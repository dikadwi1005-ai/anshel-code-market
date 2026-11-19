const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function evaluate(file, imports = {}) {
  const source = fs.readFileSync(file, "utf8");
  const script = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(script, {
    exports, require: name => imports[name], URL, Response, Date,
  }, { filename: file });
  return exports;
}

const finance = evaluate("lib/finance.ts");
const range = finance.wibRange("2026-11-18", "2026-11-19");
assert.equal(new Date(range.start).toISOString(), "2026-11-17T17:00:00.000Z");
assert.equal(finance.wibRange("2026-02-30", "2026-11-19"), null);
assert.equal(finance.wibRange("2024-01-01", "2026-11-19"), null);
assert.equal(finance.providerPaidTime("2026-02-30T00:00:00Z"), null);
assert.equal(finance.providerPaidTime("2026-11-19T05:00:00+07:00", Date.parse("2026-11-19T00:00:00Z")), Date.parse("2026-11-18T22:00:00Z"));
assert.equal(finance.validProviderAmounts({ fee: 650, net_amount: 49000 }, 50000), null);
assert.equal(finance.validProviderAmounts({ fee: 0, net_amount: 50000 }, 50000).fee, 0);

const paid = { payment_mode: "live", status: "paid", currency: "IDR", amount_idr: 50000,
  paid_at: { toDate: () => new Date("2026-11-18T17:30:00Z") } };
const items = [
  { id: "live-order", data: () => ({ ...paid, provider_fee_idr: 650, provider_net_idr: 49350 }) },
  { id: "older-order", data: () => paid },
  { id: "sandbox-order", data: () => ({ ...paid, payment_mode: "sandbox" }) },
  { id: "pending-order", data: () => ({ ...paid, status: "pending" }) },
];
const where = [];
const chain = {
  where(...args) { where.push(args); return this; },
  orderBy() { return this; },
  select(...fields) { assert.ok(!fields.includes("buyer_email")); return this; },
  limit(amount) { assert.equal(amount, 10001); return this; },
  async get() { return { docs: items, size: items.length }; },
};
const { GET } = evaluate("app/api/admin/finance/route.ts", {
  "@/lib/finance": finance,
  "firebase-admin/auth": { getAuth: () => ({
    verifyIdToken: async (token, revoked) => {
      assert.equal(revoked, true);
      if (token === "valid_admin" || token === "valid_buyer") return { uid: token };
      throw new Error("invalid");
    },
  }) },
  "firebase-admin/firestore": { Timestamp: { fromMillis: value => value } },
  "@/lib/server/commerce": { commerceServices: () => ({ app: {}, db: {
    collection(name) {
      if (name === "market_admins") return { doc: uid => ({ get: async () => ({ exists: uid === "valid_admin" }) }) };
      assert.equal(name, "market_orders");
      return chain;
    },
  } }) },
});

async function run() {
  const call = (token, query = "from=2026-11-18&to=2026-11-19") =>
    GET(new Request("http://localhost/api/admin/finance?" + query,
      { headers: token ? { authorization: "Bearer " + token } : {} }));
  assert.equal((await call()).status, 401);
  assert.equal((await call("invalid")).status, 401);
  assert.equal((await call("valid_buyer")).status, 403);
  assert.equal((await call("valid_admin", "from=invalid&to=2026-11-19")).status, 400);
  const response = await call("valid_admin");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const report = await response.json();
  assert.deepEqual(where, [["paid_at", ">=", range.start], ["paid_at", "<", range.endExclusive]]);
  assert.deepEqual(report.totals, { gross: 100000, payments: 2, recordedFee: 650, recordedNet: 49350, missing: 1 });
  assert.deepEqual(report.days.map(day => [day.date, day.payments]), [["2026-11-18", 0], ["2026-11-19", 2]]);
  assert.equal(report.rows[1].fee, null);
  const csv = await call("valid_admin", "from=2026-11-18&to=2026-11-19&format=csv");
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  const exportText = await csv.text();
  assert.match(exportText, /older-order,[^,]+,50000,,/);
  assert.doesNotMatch(exportText, /sandbox-order|pending-order/);
  console.log("PASS: admin-only finance, WIB ranges, live-only records, fee integrity, partial data, and CSV");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
