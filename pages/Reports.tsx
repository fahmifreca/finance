import Card from "@/components/Card";
import { useStore } from "@/lib/storage";
import { inRange, cashflow, pnlAccrual, pnlActual, byBrand } from "@/utils/calc";
import { useMemo, useState } from "react";
import { parseISO, addMonths, subDays, format, differenceInCalendarDays } from "date-fns";

/* ---------------- utils ---------------- */
const fmt = (n: number) => "Rp " + (n || 0).toLocaleString("id-ID");
const pct = (x: number) => (isFinite(x) ? (x >= 0 ? "+" : "") + x.toFixed(1) + "%" : "-");

function computePrevRange(from?: string, to?: string) {
  if (from && to) {
    const d = Math.max(1, differenceInCalendarDays(new Date(to), new Date(from)) + 1);
    const prevTo = subDays(parseISO(from), 1);
    const prevFrom = subDays(prevTo, d - 1);
    return { from: format(prevFrom, "yyyy-MM-dd"), to: format(prevTo, "yyyy-MM-dd") };
  }
  const now = new Date();
  const curFrom = format(subDays(now, 29), "yyyy-MM-dd");
  const curTo = format(now, "yyyy-MM-dd");
  const prevTo = subDays(parseISO(curFrom), 1);
  const prevFrom = subDays(prevTo, 29);
  return {
    current: { from: curFrom, to: curTo },
    previous: { from: format(prevFrom, "yyyy-MM-dd"), to: format(prevTo, "yyyy-MM-dd") },
  };
}

// Porsi beban jatuh pada periode (untuk akrual)
function amortizedPortion(amount: number, months: number, startISO: string, range?: { from?: string; to?: string }) {
  if (!months || months <= 0) return 0;
  const monthly = amount / months;
  const start = parseISO(startISO);
  let total = 0;
  for (let i = 0; i < months; i++) {
    const periodStart = addMonths(start, i);
    if (inRange(periodStart.toISOString(), range)) total += monthly;
  }
  return total;
}

// Share pendapatan per brand (seluruh brand)
function makeBrandShareGetter(rows: any[], range: { from?: string; to?: string }, basis: "accrual" | "actual") {
  const incomeMap: Record<string, number> = {};
  for (const r of rows) {
    if (r.type !== "income" || !r?.date) continue;
    if (!inRange(r.date, range)) continue;
    if (basis !== "accrual" && r.revenueMode === "accrual") continue;
    const b = r.brand || "—";
    incomeMap[b] = (incomeMap[b] || 0) + (r.amount || 0);
  }
  const total = Object.values(incomeMap).reduce((a, b) => a + b, 0);
  return (brand: string) => (total > 0 ? (incomeMap[brand] || 0) / total : 0);
}

// Share pendapatan per brand tapi dibatasi only targets (untuk joinTargets)
function getShareForBrandWithinTargets(
  rows: any[],
  range: { from?: string; to?: string },
  basis: "accrual" | "actual",
  targets: string[] | undefined,
  brand: string
) {
  const incomeMap: Record<string, number> = {};
  for (const r of rows) {
    if (r.type !== "income" || !r?.date) continue;
    if (!inRange(r.date, range)) continue;
    if (basis !== "accrual" && r.revenueMode === "accrual") continue;
    if (targets && targets.length > 0 && !targets.includes(r.brand)) continue;
    const b = r.brand || "—";
    incomeMap[b] = (incomeMap[b] || 0) + (r.amount || 0);
  }
  const total = Object.values(incomeMap).reduce((a, b) => a + b, 0);
  return total > 0 ? (incomeMap[brand] || 0) / total : 0;
}

/* ---------------- KPI Box ---------------- */
function KPIBox({ title, value, changePct, tone = "blue", icon }:{
  title: string; value: string | number; changePct: number; tone?: "green" | "red" | "blue" | "indigo"; icon?: React.ReactNode;
}) {
  const borderMap: Record<string, string> = {
    green: "border-l-4 border-green-500",
    red: "border-l-4 border-red-500",
    blue: "border-l-4 border-blue-500",
    indigo: "border-l-4 border-indigo-500",
  };
  const changeColor = changePct >= 0 ? "text-green-600" : "text-red-600";
  const badgeBg = changePct >= 0 ? "bg-green-50" : "bg-red-50";
  return (
    <div className={`rounded-2xl bg-white shadow-card ${borderMap[tone]} p-5`}>
      <div className="flex items-center justify-between">
        <div className="text-slate-500 text-sm">{title}</div>
        <div className="text-2xl">{icon ?? ""}</div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className={`mt-2 inline-flex items-center gap-2 text-sm ${changeColor}`}>
        <span className={`px-2 py-0.5 rounded-full ${badgeBg}`}>{pct(changePct)}</span>
        <span className="text-slate-500">vs periode sebelumnya</span>
      </div>
    </div>
  );
}

function KPIBoxPerBrand({ title, value, tone, icon }:{
  title: string; value: string | number; tone: "green" | "red" | "blue" | "indigo"; icon?: React.ReactNode;
}) {
  const borderMap: Record<string, string> = {
    green: "border-l-4 border-green-500",
    red: "border-l-4 border-red-500",
    blue: "border-l-4 border-blue-500",
    indigo: "border-l-4 border-indigo-500",
  };
  return (
    <div className={`rounded-2xl bg-white shadow-card ${borderMap[tone]} p-5`}>
      <div className="flex items-center justify-between">
        <div className="text-slate-500 text-sm">{title}</div>
        <div className="text-2xl">{icon ?? ""}</div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

/* ---------------- MAIN ---------------- */
export default function Reports() {
  const rows = useStore((s) => s.transactions);
  const brands = useStore((s) => s.brands);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [tab, setTab] = useState<"cashflow" | "accrual" | "actual" | "balance">("cashflow");

  const [brandAcc, setBrandAcc] = useState<string>("");
  const [brandAct, setBrandAct] = useState<string>("");

  const range = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);
  const { current, previous } = useMemo(() => {
    const base = computePrevRange(range.from, range.to);
    if ("current" in base) return base as any;
    return { current: { from: range.from!, to: range.to! }, previous: base as any };
  }, [range]);

  /* ---- KPI per tab ---- */
  const cfNow = cashflow(rows, current);
  const cfPrev = cashflow(rows, previous);
  const cfIncomeChange = cfPrev.inflow === 0 ? (cfNow.inflow > 0 ? 100 : 0) : ((cfNow.inflow - cfPrev.inflow) / cfPrev.inflow) * 100;
  const cfExpenseChange = cfPrev.outflow === 0 ? (cfNow.outflow > 0 ? 100 : 0) : ((cfNow.outflow - cfPrev.outflow) / cfPrev.outflow) * 100;
  const cfProfitChange = cfPrev.net === 0 ? (cfNow.net > 0 ? 100 : 0) : ((cfNow.net - cfPrev.net) / Math.abs(cfPrev.net)) * 100;

  const accNow = pnlAccrual(rows, current);
  const accPrev = pnlAccrual(rows, previous);
  const accIncChg = accPrev.income === 0 ? (accNow.income > 0 ? 100 : 0) : ((accNow.income - accPrev.income) / accPrev.income) * 100;
  const accExpChg = accPrev.expense === 0 ? (accNow.expense > 0 ? 100 : 0) : ((accNow.expense - accPrev.expense) / accPrev.expense) * 100;
  const accPrfChg = accPrev.profit === 0 ? (accNow.profit > 0 ? 100 : 0) : ((accNow.profit - accPrev.profit) / Math.abs(accPrev.profit)) * 100;

  const actNow = pnlActual(rows, current);
  const actPrev = pnlActual(rows, previous);
  const actIncChg = actPrev.income === 0 ? (actNow.income > 0 ? 100 : 0) : ((actNow.income - actPrev.income) / actPrev.income) * 100;
  const actExpChg = actPrev.expense === 0 ? (actNow.expense > 0 ? 100 : 0) : ((actNow.expense - actPrev.expense) / actPrev.expense) * 100;
  const actPrfChg = actPrev.profit === 0 ? (actNow.profit > 0 ? 100 : 0) : ((actNow.profit - actPrev.profit) / Math.abs(actPrev.profit)) * 100;

  /* ---- Neraca sederhana ---- */
  const balance = useMemo(() => {
    const cfv = cashflow(rows, range);
    let prepaid = 0;
    for (const r of rows) {
      if (r.type !== "expense" || !r.amortizeMonths || r.amortizeMonths <= 0) continue;
      const taken = amortizedPortion(r.amount, r.amortizeMonths, r.amortizeStart || r.date, range);
      const paidThisPeriod = r?.date && inRange(r.date, range) ? r.amount : 0;
      prepaid += paidThisPeriod - taken;
    }
    const totalAssets = cfv.net + prepaid;
    return { assets: { cash: cfv.net, prepaid }, totalAssets, liabilities: 0, equity: totalAssets };
  }, [rows, range]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Laporan Keuangan</h1>
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input px-2 py-1 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input px-2 py-1 text-sm" />
          {(from || to) && (
            <button onClick={() => { setFrom(""); setTo(""); }} className="btn-secondary text-sm px-3">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: "cashflow", label: "Cashflow" },
          { id: "accrual", label: "Laba Rugi (Akrual)" },
          { id: "actual", label: "Laba Rugi (Aktual)" },
          { id: "balance", label: "Neraca" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 -mb-px border-b-2 ${
              tab === t.id ? "border-brand text-brand font-medium" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CASHFLOW */}
      {tab === "cashflow" && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <KPIBox title="Total Income" value={fmt(cfNow.inflow)} changePct={cfIncomeChange} tone="green" icon={<span>💰</span>} />
            <KPIBox title="Total Expenses" value={fmt(cfNow.outflow)} changePct={cfExpenseChange} tone="red" icon={<span>💸</span>} />
            <KPIBox title="Net Cashflow" value={fmt(cfNow.net)} changePct={cfProfitChange} tone="blue" icon={<span>📈</span>} />
          </div>
          <DetailTable title="Pendapatan (Aktual)" rows={rows} type="income" basis="actual" range={range} />
          <DetailTable title="Pengeluaran (Aktual)" rows={rows} type="expense" basis="actual" range={range} />
        </>
      )}

      {/* AKRUAL */}
      {tab === "accrual" && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <KPIBox title="Pendapatan (Akrual)" value={fmt(accNow.income)} changePct={accIncChg} tone="green" icon={<span>💰</span>} />
            <KPIBox title="Pengeluaran (Akrual)" value={fmt(accNow.expense)} changePct={accExpChg} tone="red" icon={<span>💸</span>} />
            <KPIBox title="Laba (Akrual)" value={fmt(accNow.profit)} changePct={accPrfChg} tone="blue" icon={<span>📊</span>} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-slate-600">Laporan per Brand:</span>
            <select className="select" value={brandAcc} onChange={(e) => setBrandAcc(e.target.value)}>
              <option value="">— Semua Brand —</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          {brandAcc && (() => {
            const b = byBrand(rows,"accrual",range).find((x:any)=>x.brand===brandAcc)
            if(!b) return null
            return (
              <div className="grid sm:grid-cols-4 gap-4 my-4">
                <KPIBoxPerBrand title="Pendapatan Brand" value={fmt(b.income)} tone="green" icon={<span>💰</span>} />
                <KPIBoxPerBrand title="Pengeluaran Brand" value={fmt(b.direct+b.joinAllocated)} tone="red" icon={<span>💸</span>} />
                <KPIBoxPerBrand title="Laba Brand" value={fmt(b.profit)} tone="blue" icon={<span>📊</span>} />
                <KPIBoxPerBrand title="NPM Brand" value={b.income>0?((b.profit/b.income*100).toFixed(1)+'%'):'-'} tone="indigo" icon={<span>🎯</span>} />
              </div>
            )
          })()}
          <DetailTable title="Pendapatan (Akrual)" rows={rows} type="income" basis="accrual" range={range} brandFilter={brandAcc}/>
          <DetailTable title="Pengeluaran (Akrual)" rows={rows} type="expense" basis="accrual" range={range} brandFilter={brandAcc}/>
        </>
      )}

      {/* AKTUAL */}
      {tab === "actual" && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <KPIBox title="Pendapatan (Aktual)" value={fmt(actNow.income)} changePct={actIncChg} tone="green" icon={<span>💰</span>} />
            <KPIBox title="Pengeluaran (Aktual)" value={fmt(actNow.expense)} changePct={actExpChg} tone="red" icon={<span>💸</span>} />
            <KPIBox title="Laba (Aktual)" value={fmt(actNow.profit)} changePct={actPrfChg} tone="blue" icon={<span>📊</span>} />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-slate-600">Laporan per Brand:</span>
            <select className="select" value={brandAct} onChange={(e) => setBrandAct(e.target.value)}>
              <option value="">— Semua Brand —</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          {brandAct && (() => {
            const b = byBrand(rows,"actual",range).find((x:any)=>x.brand===brandAct)
            if(!b) return null
            return (
              <div className="grid sm:grid-cols-4 gap-4 my-4">
                <KPIBoxPerBrand title="Pendapatan Brand" value={fmt(b.income)} tone="green" icon={<span>💰</span>} />
                <KPIBoxPerBrand title="Pengeluaran Brand" value={fmt(b.direct+b.joinAllocated)} tone="red" icon={<span>💸</span>} />
                <KPIBoxPerBrand title="Laba Brand" value={fmt(b.profit)} tone="blue" icon={<span>📊</span>} />
                <KPIBoxPerBrand title="NPM Brand" value={b.income>0?((b.profit/b.income*100).toFixed(1)+'%'):'-'} tone="indigo" icon={<span>🎯</span>} />
              </div>
            )
          })()}
          <DetailTable title="Pendapatan (Aktual)" rows={rows} type="income" basis="actual" range={range} brandFilter={brandAct}/>
          <DetailTable title="Pengeluaran (Aktual)" rows={rows} type="expense" basis="actual" range={range} brandFilter={brandAct}/>
        </>
      )}

      {/* NERACA */}
      {tab === "balance" && (
        <Card title="Neraca Sederhana">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="font-semibold mb-2">Aset</div>
              <TableSimple rows={[
                { name:"Kas (periode)", amount: balance.assets.cash },
                { name:"Beban dibayar dimuka", amount: balance.assets.prepaid }
              ]} totalLabel="Total Aset" total={balance.totalAssets}/>
            </div>
            <div>
              <div className="font-semibold mb-2">Kewajiban</div>
              <TableSimple rows={[{ name:"—", amount:0 }]} totalLabel="Total Kewajiban" total={0}/>
            </div>
            <div>
              <div className="font-semibold mb-2">Ekuitas</div>
              <TableSimple rows={[{ name:"Saldo Ekuitas", amount: balance.equity }]} totalLabel="Total Ekuitas" total={balance.equity}/>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Catatan: Neraca ini menampilkan posisi kas & prepaid dalam periode terpilih.
          </div>
        </Card>
      )}
    </div>
  );
}

/* -------- TableSimple -------- */
function TableSimple({rows,totalLabel,total}:{rows:{name:string;amount:number}[];totalLabel:string;total:number}) {
  return (
    <div className="overflow-auto rounded-xl border">
      <table className="w-full">
        <thead className="bg-slate-50 text-left text-sm text-slate-600">
          <tr>
            <th className="px-3 py-2">Keterangan</th>
            <th className="px-3 py-2 text-right">Nominal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.name} className="border-t">
              <td className="px-3 py-2">{r.name}</td>
              <td className="px-3 py-2 text-right">{fmt(r.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50">
          <tr>
            <td className="px-3 py-2 font-semibold">{totalLabel}</td>
            <td className="px-3 py-2 text-right font-semibold">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* -------- DetailTable (pagination + ringkasan + alokasi join cost by joinTargets) -------- */
function DetailTable({
  title, rows, type, basis, range, brandFilter,
}:{
  title:string; rows:any[]; type:'income'|'expense'; basis:'actual'|'accrual'; range:{from?:string;to?:string}; brandFilter?:string;
}) {
  // base filter
  const base = rows.filter((r) => {
    if (r.type !== type) return false;
    if (!r?.date) return false;
    if (!inRange(r.date, range)) return false;

    if (brandFilter) {
      if (type === "expense") {
        // exclude join cost direct rows (akan dialokasikan)
        if (r.scope === "join") return false;
        // direct expense wajib match brand
        if (r.brand !== brandFilter) return false;
      } else {
        if (r.brand !== brandFilter) return false;
      }
    }

    if (type === "income" && basis !== "accrual" && r.revenueMode === "accrual") return false;
    return true;
  });

  // alokasi JOIN COST (saat filter brand aktif & tipe expense)
  let allocatedExtras: any[] = [];
  if (type === "expense" && brandFilter) {
    for (const e of rows) {
      if (e.type !== "expense" || !e?.date) continue;
      if (e.scope !== "join") continue; // join cost only
      // jika joinTargets ada & brand ini TIDAK termasuk → skip
      const targets: string[] | undefined = Array.isArray(e.joinTargets) ? e.joinTargets : undefined;
      if (targets && targets.length > 0 && !targets.includes(brandFilter)) continue;

      let alloc = 0;
      if (basis === "accrual" && e.amortizeMonths && e.amortizeMonths > 0) {
        const take = amortizedPortion(e.amount, e.amortizeMonths, e.amortizeStart || e.date, range);
        if (take <= 0) continue;
        const share = getShareForBrandWithinTargets(rows, range, basis, targets, brandFilter);
        if (share <= 0) continue;
        alloc = take * share;
      } else {
        // aktual (atau tidak amortisasi): nilai periode penuh × share
        if (!inRange(e.date, range)) continue;
        const share = getShareForBrandWithinTargets(rows, range, basis, targets, brandFilter);
        if (share <= 0) continue;
        alloc = e.amount * share;
      }

      if (alloc > 0) {
        allocatedExtras.push({
          id: `alloc-${brandFilter}-${e.id || e.date}`,
          date: e.date,
          category: e.category,
          description: (e.description ? `${e.description} • ` : "") + "Join Cost (alokasi)",
          brand: brandFilter,
          amount: alloc,
          channel: e.channel,
        });
      }
    }
  }

  const combined = type === "expense" && brandFilter ? [...base, ...allocatedExtras] : base;

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(combined.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return combined.slice(start, start + pageSize);
  }, [combined, page]);

  // ringkasan
  const grouped = useMemo(() => {
    const map: Record<string, number> = {};

    // direct aggregation (exclude join scope when brandFilter active for expenses)
    for (const r of rows) {
      if (r.type !== type) continue;

      if (brandFilter) {
        if (type === "expense") {
          if (r.scope === "join") continue; // dihandle sebagai alokasi
          if (r.brand !== brandFilter) continue;
        } else if (r.brand !== brandFilter) {
          continue;
        }
      }

      if (type === "expense" && basis === "accrual" && r.amortizeMonths && r.amortizeMonths > 0) {
        const take = amortizedPortion(r.amount, r.amortizeMonths, r.amortizeStart || r.date, range);
        if (take > 0) {
          const key = r.category;
          map[key] = (map[key] || 0) + take;
        }
        continue;
      }

      if (!r?.date || !inRange(r.date, range)) continue;
      if (type === "income" && basis !== "accrual" && r.revenueMode === "accrual") continue;

      const key = type === "income" ? r.channel || "Lainnya" : r.category;
      map[key] = (map[key] || 0) + (r.amount || 0);
    }

    // tambahkan alokasi join cost ke ringkasan (saat brandFilter aktif)
    if (type === "expense" && brandFilter) {
      for (const a of allocatedExtras) {
        const key = a.category;
        map[key] = (map[key] || 0) + a.amount;
      }
    }

    const arr = Object.entries(map).map(([name, amount]) => ({ name, amount }));
    arr.sort((a, b) => b.amount - a.amount);
    const total = arr.reduce((a, b) => a + b.amount, 0);
    return { arr, total };
  }, [rows, range, basis, type, brandFilter, allocatedExtras]);

  return (
    <Card title={title}>
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Kategori</th>
              <th className="px-3 py-2">Deskripsi</th>
              <th className="px-3 py-2">Brand</th>
              {type === "income" && <th className="px-3 py-2">Channel</th>}
              <th className="px-3 py-2 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r: any) => (
              <tr key={r.id ?? `${r.date}-${r.category}-${r.amount}`} className="border-t">
                <td className="px-3 py-2">{r?.date ? String(r.date).slice(0, 10) : "-"}</td>
                <td className="px-3 py-2">{r.category}</td>
                <td className="px-3 py-2">{r.description || "-"}</td>
                <td className="px-3 py-2">{r.brand || (brandFilter ? brandFilter : "-")}</td>
                {type === "income" && <td className="px-3 py-2">{r.channel || "-"}</td>}
                <td className="px-3 py-2 text-right">{fmt(r.amount)}</td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={type === "income" ? 6 : 5} className="py-4 text-center text-slate-500">Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-slate-500">Menampilkan {pageItems.length} dari {combined.length} transaksi</div>
        <div className="flex gap-1">
          <button className="btn-secondary px-3 py-1 text-sm" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
            <button key={n} onClick={()=>setPage(n)} className={`px-3 py-1 rounded-lg text-sm ${page===n?'bg-brand text-white':'border bg-white hover:bg-slate-50'}`}>{n}</button>
          ))}
          <button className="btn-secondary px-3 py-1 text-sm" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="mt-5">
        <div className="font-semibold mb-2">Ringkasan {type==='income'?'per Channel':'per Kategori'}</div>
        <div className="overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr><th className="px-3 py-2">{type==='income'?'Channel':'Kategori'}</th><th className="px-3 py-2 text-right">Nominal</th></tr>
            </thead>
            <tbody>
              {grouped.arr.map(r=>(
                <tr key={r.name} className="border-t">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.amount)}</td>
                </tr>
              ))}
              {grouped.arr.length===0 && <tr><td colSpan={2} className="py-4 text-center text-slate-500">Tidak ada data</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr><td className="px-3 py-2 font-semibold">Grand Total</td><td className="px-3 py-2 text-right font-semibold">{fmt(grouped.total)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Card>
  )
}
