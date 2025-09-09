import Card from "@/components/Card";
import { useStore } from "@/lib/storage";
import { byBrand, inRange, summarize } from "@/utils/calc";
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, parseISO, subDays, differenceInCalendarDays } from "date-fns";

/* ---------- helpers ---------- */
const COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#0ea5e9",
  "#22c55e",
  "#eab308",
  "#f97316",
];

const fmt = (n: number) => "Rp " + (n || 0).toLocaleString("id-ID");
const pct = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(1) + "%";

/** hitung periode sebelumnya untuk KPI growth */
function computePrevRange(from?: string, to?: string) {
  if (from && to) {
    const d = Math.max(
      1,
      differenceInCalendarDays(new Date(to), new Date(from)) + 1
    );
    const prevTo = subDays(parseISO(from), 1);
    const prevFrom = subDays(prevTo, d - 1);
    return {
      from: format(prevFrom, "yyyy-MM-dd"),
      to: format(prevTo, "yyyy-MM-dd"),
    };
  }
  // default: 30 hari terakhir vs 30 hari sebelumnya
  const now = new Date();
  const curFrom = format(subDays(now, 29), "yyyy-MM-dd");
  const curTo = format(now, "yyyy-MM-dd");
  const prevTo = subDays(parseISO(curFrom), 1);
  const prevFrom = subDays(prevTo, 29);
  return {
    current: { from: curFrom, to: curTo },
    previous: {
      from: format(prevFrom, "yyyy-MM-dd"),
      to: format(prevTo, "yyyy-MM-dd"),
    },
  };
}

/* ----- tipe ringkasan brand agar VS Code tidak merah ----- */
type BrandRow = {
  brand: string;
  income: number;
  direct: number;
  joinAllocated: number;
  profit: number;
};

function KPIBox({
  title,
  value,
  changePct,
  tone = "blue",
  icon,
}: {
  title: string;
  value: string | number;
  changePct: number;
  tone?: "green" | "red" | "blue" | "indigo";
  icon?: React.ReactNode;
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

export default function Dashboard() {
  const rows = useStore((s) => s.transactions);

  // ===== Filter tanggal kecil (pojok kanan) =====
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const range = useMemo(
    () => ({ from: from || undefined, to: to || undefined }),
    [from, to]
  );

  // tentukan currentRange & previousRange untuk KPI growth
  const { current, previous } = useMemo(() => {
    const base = computePrevRange(range.from, range.to);
    if ("current" in base) return base as any;
    return { current: { from: range.from!, to: range.to! }, previous: base };
  }, [range]);

  // KPI cash-basis (pakai summarize = cashflow)
  const kpiNow = summarize(rows, current);
  const kpiPrev = summarize(rows, previous);
  const incomeChange =
    kpiPrev.income === 0
      ? kpiNow.income > 0
        ? 100
        : 0
      : ((kpiNow.income - kpiPrev.income) / kpiPrev.income) * 100;
  const expenseChange =
    kpiPrev.expense === 0
      ? kpiNow.expense > 0
        ? 100
        : 0
      : ((kpiNow.expense - kpiPrev.expense) / kpiPrev.expense) * 100;

  const profitNow = kpiNow.income - kpiNow.expense;
  const profitPrev = kpiPrev.income - kpiPrev.expense;
  const profitChange =
    profitPrev === 0
      ? profitNow > 0
        ? 100
        : 0
      : ((profitNow - profitPrev) / Math.abs(profitPrev)) * 100;

  const marginNow = kpiNow.income > 0 ? (profitNow / kpiNow.income) * 100 : 0;
  const marginPrev =
    kpiPrev.income > 0 ? ((kpiPrev.income - kpiPrev.expense) / kpiPrev.income) * 100 : 0;
  const marginChange =
    marginPrev === 0
      ? marginNow > 0
        ? 100
        : 0
      : ((marginNow - marginPrev) / Math.abs(marginPrev)) * 100;

  // Ringkasan per brand (Akrual dan Aktual) — mengikuti range
  const brandsAccrual: BrandRow[] = useMemo(
    () => byBrand(rows, "accrual", range) as BrandRow[],
    [rows, range]
  );
  const brandsActual: BrandRow[] = useMemo(
    () => byBrand(rows, "actual", range) as BrandRow[],
    [rows, range]
  );

  // ====== data untuk grafik trendline (cash basis) ======
  const chartData = useMemo(() => {
    const map: Record<
      string,
      { date: string; income: number; expense: number }
    > = {};
    for (const r of rows) {
      if (!inRange(r.date, range)) continue;
      const d = r.date.slice(0, 10);
      if (!map[d]) map[d] = { date: d, income: 0, expense: 0 };
      if (r.type === "income" && r.revenueMode !== "accrual") map[d].income += r.amount;
      if (r.type === "expense") map[d].expense += r.amount;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows, range]);

  // ===== Pie: Spending by Category (ikut range) =====
  const spendByCat = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (r.type === "expense" && inRange(r.date, range)) {
        map[r.category] = (map[r.category] || 0) + r.amount;
      }
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows, range]);

  // ===== Pie: Income by Brand (Aktual, ikut range) =====
  const incomeByBrand = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (r.type === "income" && r.revenueMode !== "accrual" && inRange(r.date, range)) {
        const b = r.brand || "Tanpa Brand";
        map[b] = (map[b] || 0) + r.amount;
      }
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows, range]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header + filter kecil */}
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-blue-600 text-white px-6 py-4">
          <h1 className="text-xl font-bold">Welcome to Your Financial Dashboard</h1>
          <p className="text-white/80">
            Track your business performance and make informed decisions
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input px-2 py-1 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input px-2 py-1 text-sm"
          />
          {(from || to) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="btn-secondary text-sm px-3"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBox
          title="Total Income"
          value={fmt(kpiNow.income)}
          changePct={incomeChange}
          tone="green"
          icon={<span>💰</span>}
        />
        <KPIBox
          title="Total Expenses"
          value={fmt(kpiNow.expense)}
          changePct={expenseChange}
          tone="red"
          icon={<span>💸</span>}
        />
        <KPIBox
          title="Net Profit"
          value={fmt(profitNow)}
          changePct={profitChange}
          tone="blue"
          icon={<span>📈</span>}
        />
        <KPIBox
          title="Profit Margin"
          value={kpiNow.income > 0 ? `${marginNow.toFixed(1)}%` : "-"}
          changePct={marginChange}
          tone="indigo"
          icon={<span>🎯</span>}
        />
      </div>

      {/* Trendline */}
      <Card title="Monthly Overview (Aktual)">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(val: any) => fmt(val)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#10b981"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Expenses"
                stroke="#ef4444"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Pie charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Spending by Category">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
  data={spendByCat}
  dataKey="value"
  nameKey="name"
  outerRadius={110}
  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
  labelLine={false}
>
  {spendByCat.map((_, i) => (
    <Cell key={i} fill={COLORS[i % COLORS.length]} />
  ))}
</Pie>
              <Tooltip formatter={(val: any) => fmt(val)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Income by Brand (Aktual)">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
  data={incomeByBrand}
  dataKey="value"
  nameKey="name"
  outerRadius={110}
  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
  labelLine={false}
>
  {incomeByBrand.map((_, i) => (
    <Cell key={i} fill={COLORS[i % COLORS.length]} />
  ))}
</Pie>
              <Tooltip formatter={(val: any) => fmt(val)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tabel ringkasan brand (Akrual) */}
      <Card title="Ringkasan per Brand (Akrual, dengan alokasi Join Cost)">
        <div className="overflow-auto">
          <table className="w-full min-w-[720px]">
            <thead className="text-left text-sm text-slate-500">
              <tr>
                <th className="px-4 py-2">Brand</th>
                <th className="px-4 py-2 text-right">Pendapatan</th>
                <th className="px-4 py-2 text-right">Biaya Langsung</th>
                <th className="px-4 py-2 text-right">Alokasi Join Cost</th>
                <th className="px-4 py-2 text-right">Laba</th>
              </tr>
            </thead>
            <tbody>
              {brandsAccrual.map((b) => (
                <tr key={b.brand} className="border-t">
                  <td className="px-4 py-2">{b.brand}</td>
                  <td className="px-4 py-2 text-right">{fmt(b.income)}</td>
                  <td className="px-4 py-2 text-right">{fmt(b.direct)}</td>
                  <td className="px-4 py-2 text-right">{fmt(b.joinAllocated)}</td>
                  <td className="px-4 py-2 text-right">{fmt(b.profit)}</td>
                </tr>
              ))}
              {brandsAccrual.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Tidak ada data pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabel ringkasan brand (Aktual) */}
      <Card title="Ringkasan per Brand (Aktual)">
        <div className="overflow-auto">
          <table className="w-full min-w-[720px]">
            <thead className="text-left text-sm text-slate-500">
              <tr>
                <th className="px-4 py-2">Brand</th>
                <th className="px-4 py-2 text-right">Pendapatan (Aktual)</th>
                <th className="px-4 py-2 text-right">Biaya (dibayar)</th>
                <th className="px-4 py-2 text-right">Laba (Aktual)</th>
              </tr>
            </thead>
            <tbody>
              {brandsActual.map((b) => (
                <tr key={b.brand} className="border-t">
                  <td className="px-4 py-2">{b.brand}</td>
                  <td className="px-4 py-2 text-right">{fmt(b.income)}</td>
                  <td className="px-4 py-2 text-right">{fmt(b.direct + b.joinAllocated)}</td>
                  <td className="px-4 py-2 text-right">{fmt(b.profit)}</td>
                </tr>
              ))}
              {brandsActual.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    Tidak ada data pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
