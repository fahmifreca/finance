import { useMemo, useState } from "react";
import { useStore } from "@/lib/storage";
import type { TxType, Scope, RevenueMode, Transaction } from "@/types";
import { useAuth } from "@/lib/auth";

/* ---------- helpers & small UI atoms ---------- */
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
const fmtRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function ToggleCard({
  active,
  onClick,
  title,
  subtitle,
  tone = "blue",
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  tone?: "blue" | "red" | "purple" | "amber" | "green";
  icon?: React.ReactNode;
}) {
  const toneMap: Record<string, string> = {
    blue: active
      ? "border-brand bg-brand text-white"
      : "border-slate-200 bg-white hover:bg-slate-50",
    red: active
      ? "border-red-500 bg-red-500 text-white"
      : "border-slate-200 bg-white hover:bg-slate-50",
    purple: active
      ? "border-purple-500 bg-purple-500 text-white"
      : "border-slate-200 bg-white hover:bg-slate-50",
    amber: active
      ? "border-amber-400 bg-amber-400 text-white"
      : "border-slate-200 bg-white hover:bg-slate-50",
    green: active
      ? "border-green-500 bg-green-500 text-white"
      : "border-slate-200 bg-white hover:bg-slate-50",
  };
  const subTone = active ? "text-white/90" : "text-slate-500";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-5 transition shadow-sm ${toneMap[tone]}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            active ? "bg-white/15 text-white" : "bg-brand-light text-brand"
          }`}
        >
          {icon ?? "💳"}
        </div>
        <div className="text-left">
          <div className="font-semibold">{title}</div>
          {subtitle && <div className={`text-xs ${subTone}`}>{subtitle}</div>}
        </div>
      </div>
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </div>
      {children}
    </label>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={`input w-full ${className || ""}`} />;
}
function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={`select w-full ${className || ""}`}>
      {children}
    </select>
  );
}
function CurrencyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
      <span className="text-slate-400">Rp</span>
      <input
        inputMode="numeric"
        className="w-full outline-none"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ---------- Confirm Modal ---------- */
import type { Transaction as Tx } from "@/types";
type TxDraft = Omit<Tx, "id">;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-1 text-sm">
      <div className="text-slate-500">{k}</div>
      <div className="col-span-2 font-medium">{v || "-"}</div>
    </div>
  );
}

function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  data,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  data: TxDraft;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-card border border-slate-100">
        <div className="p-5">
          <h3 className="text-lg font-semibold">Konfirmasi Transaksi</h3>
          <p className="text-sm text-slate-600 mt-1">Apakah data berikut sudah benar?</p>

          <div className="mt-4 rounded-xl border bg-slate-50 p-3">
            <Row k="Jenis" v={data.type === "income" ? "Pemasukan" : "Pengeluaran"} />
            <Row
              k="Scope"
              v={
                data.scope === "brand"
                  ? "Khusus Brand"
                  : data.scope === "join"
                  ? "Join Cost"
                  : "Keseluruhan"
              }
            />
            {data.brand && <Row k="Brand" v={data.brand} />}
            <Row k="Kategori" v={data.category} />
            <Row k="Nominal" v={fmtRp(data.amount)} />
            {data.type === "income" && (
              <Row
                k="Metode"
                v={data.revenueMode === "accrual" ? "Akrual (belum cair)" : "Aktual (sudah cair)"}
              />
            )}
            {data.type === "income" && data.channel && <Row k="Channel" v={data.channel} />}
            {data.type === "expense" && data.amortizeMonths ? (
              <Row k="Beban Terjadwal" v={`${data.amortizeMonths} bulan`} />
            ) : null}
            {data.proofUrl && (
              <Row
                k="Bukti"
                v={
                  <a className="text-brand underline" href={data.proofUrl} target="_blank" rel="noreferrer">
                    Lihat
                  </a>
                }
              />
            )}
            <Row k="Diinput oleh" v={data.inputBy} />
            <Row k="Tanggal" v={new Date(data.date).toLocaleDateString("id-ID")} />
            {data.description && <Row k="Deskripsi" v={data.description} />}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary px-4 py-2" onClick={onCancel}>
              Batal
            </button>
            <button className="btn px-4 py-2" onClick={onConfirm}>
              Benar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- main form ---------- */
export default function TransactionForm() {
  const addTx = useStore((s) => s.addTx);
  const brands = useStore((s) => s.brands);
  const channels = useStore((s) => s.channels);
  const catIncome = useStore((s) => s.categoriesIncome);
  const catExpense = useStore((s) => s.categoriesExpense);
  const addCatIncome = useStore((s) => s.addCategoryIncome);
  const addCatExpense = useStore((s) => s.addCategoryExpense);

  const users = useStore((s) => s.users);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0],
    [users, currentUserId]
  );

  // auth firebase
  const { user } = useAuth();
  const inputByName = user?.displayName || user?.email || currentUser?.name || "Unknown";

  // state
  const [type, setType] = useState<TxType>("income");
  const [scope, setScope] = useState<Scope>("brand");
  const [brand, setBrand] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>(catIncome[0] ?? "");
  const [desc, setDesc] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const [channel, setChannel] = useState<string>(channels[0] ?? "shopee");

  // khusus pemasukan
  const [revenueMode, setRevenueMode] = useState<RevenueMode>("actual");
  // khusus pengeluaran
  const [amortize, setAmortize] = useState<boolean>(false);
  const [amortizeMonths, setAmortizeMonths] = useState<string>("");
  const [proofUrl, setProofUrl] = useState<string>("");

  // modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draft, setDraft] = useState<TxDraft | null>(null);

  const cats = type === "income" ? catIncome : catExpense;

  const onQuickAddCategory = () => {
    const name = prompt(
      `Tambah kategori ${type === "income" ? "pemasukan" : "pengeluaran"} baru:`
    );
    if (!name || !name.trim()) return;
    if (type === "income") addCatIncome(name.trim());
    else addCatExpense(name.trim());
    setCategory(name.trim());
  };

  // Jika pindah ke pemasukan & scope join sedang aktif, paksa scope brand
  const chooseIncome = () => {
    setType("income");
    setCategory(catIncome[0] ?? "");
    if (scope === "join") setScope("brand");
  };
  const chooseExpense = () => {
    setType("expense");
    setCategory(catExpense[0] ?? "");
  };

  // klik Simpan -> tampilkan modal
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    const d: TxDraft = {
      date: new Date(date).toISOString(),
      type,
      category,
      description: desc || undefined,
      amount: Number(amount),
      scope,
      brand: scope === "brand" ? brand || undefined : undefined,
      channel: type === "income" ? (channel as any) : undefined,
      inputBy: inputByName,
      proofUrl: type === "expense" && proofUrl ? proofUrl : undefined,
      revenueMode: type === "income" ? revenueMode : undefined,
      amortizeMonths:
        type === "expense" && amortize ? Number(amortizeMonths || "0") || 0 : undefined,
      amortizeStart:
        type === "expense" && amortize ? new Date(date).toISOString() : undefined,
    };

    setDraft(d);
    setConfirmOpen(true);
  };

  const doConfirm = () => {
    if (!draft) return;
    const tx: Transaction = { id: uid(), ...draft };
    addTx(tx);
    setConfirmOpen(false);
    setDraft(null);
    // reset ringan
    setDesc("");
    setAmount("");
    setProofUrl("");
    setAmortize(false);
    setAmortizeMonths("");
  };

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">Tambah Transaksi Baru</h2>
          <p className="text-slate-500">Catat pemasukan atau pengeluaran bisnis Anda</p>
        </div>

        {/* Jenis Transaksi */}
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">Jenis Transaksi</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <ToggleCard
              active={type === "income"}
              onClick={chooseIncome}
              title="Pemasukan"
              subtitle="Uang masuk"
              tone="blue"
              icon={<span>💰</span>}
            />
            <ToggleCard
              active={type === "expense"}
              onClick={chooseExpense}
              title="Pengeluaran"
              subtitle="Uang keluar"
              tone="red"
              icon={<span>💸</span>}
            />
          </div>
        </div>

        {/* Tipe Biaya / Scope */}
        <div>
          <div className="text-sm font-medium text-slate-700 mb-2">Tipe Biaya</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <ToggleCard
              active={scope === "brand"}
              onClick={() => setScope("brand")}
              title="Khusus Brand"
              subtitle="Untuk satu brand saja"
              tone="purple"
              icon={<span>🎯</span>}
            />
            {/* Join Cost hanya saat PENGELUARAN */}
            {type === "expense" && (
              <ToggleCard
                active={scope === "join"}
                onClick={() => setScope("join")}
                title="Join Cost"
                subtitle="Dibagi antar brand"
                tone="amber"
                icon={<span>🤝</span>}
              />
            )}
          </div>
        </div>

        {/* Brand + Category + Amount */}
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Brand Tujuan">
            <Select value={brand} onChange={(e) => setBrand(e.target.value)} disabled={scope !== "brand"}>
              <option value="">{scope === "brand" ? "Pilih Brand" : "— Tidak perlu (Join Cost) —"}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kategori" required>
            <div className="flex gap-2">
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="flex-1">
                <option value="">{type === "income" ? "Pilih kategori pemasukan" : "Pilih kategori pengeluaran"}</option>
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={onQuickAddCategory}
                title="Tambah kategori"
                className="rounded-xl border px-3 py-2 bg-white hover:bg-slate-50"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="Jumlah (Rp)" required>
            <CurrencyInput value={amount} onChange={setAmount} />
          </Field>

          {/* Metode & Channel HANYA saat PEMASUKAN */}
          {type === "income" ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Metode Pencatatan">
                <Select value={revenueMode} onChange={(e) => setRevenueMode(e.target.value as RevenueMode)}>
                  <option value="actual">Aktual (uang sudah masuk)</option>
                  <option value="accrual">Akrual (pesanan/COD belum cair)</option>
                </Select>
              </Field>
              <Field label="Channel">
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  {channels.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            // Pengeluaran: amortisasi + bukti
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border bg-brand-light px-3 py-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={amortize} onChange={(e) => setAmortize(e.target.checked)} />
                  <span className="text-sm font-medium">Pembayaran Berulang (untuk Laba Rugi)</span>
                </label>
                {amortize && (
                  <div className="mt-2 grid sm:grid-cols-2 gap-3">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Jumlah bulan (mis. 24)"
                      value={amortizeMonths}
                      onChange={(e) => setAmortizeMonths(e.target.value)}
                    />
                    <div className="text-xs text-slate-600 self-center">Beban di L/R akrual akan dibagi rata per bulan.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Deskripsi + Bukti + Input By + Tanggal */}
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Deskripsi">
            <Input placeholder="Deskripsi singkat transaksi" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <Field label="Link Bukti Transaksi (Google Drive)">
            <Input
              placeholder="https://drive.google.com/..."
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
            />
          </Field>
          <Field label="Diinput Oleh">
            <Input value={inputByName} readOnly />
          </Field>
          <Field label="Tanggal">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <div className="text-sm text-slate-500">Pastikan data sudah benar sebelum menyimpan.</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setDesc("");
                setAmount("");
                setProofUrl("");
              }}
              className="btn-secondary px-5"
            >
              Batal
            </button>
            <button className="btn px-5">Tambah Transaksi</button>
          </div>
        </div>
      </form>

      {/* Modal Konfirmasi */}
      {draft && (
        <ConfirmModal open={confirmOpen} onCancel={() => setConfirmOpen(false)} onConfirm={doConfirm} data={draft} />
      )}
    </>
  );
}
