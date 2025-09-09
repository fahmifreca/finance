import { useMemo, useState } from 'react'
import { useStore } from '@/lib/storage'
import { format } from 'date-fns'
import type { TxType } from '@/types'
import { filterRows } from '@/utils/calc'

export default function TransactionsTable() {
  const rows = useStore(s => s.transactions)
  const brands = useStore(s => s.brands)

  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(5)
  const [type, setType] = useState<'' | TxType>('')
  const [brand, setBrand] = useState<string>('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  const filtered = useMemo(()=>{
    const base = filterRows(rows, {from: from||undefined, to: to||undefined}, type||undefined, brand||undefined)
    const s = q.toLowerCase()
    return base.filter(r =>
      !q || r.description?.toLowerCase().includes(s) || r.category.toLowerCase().includes(s) || r.type.includes(s) || r.inputBy.toLowerCase().includes(s)
    )
  }, [rows, q, type, brand, from, to])

  const pages = Math.max(1, Math.ceil(filtered.length / perPage))
  const slice = filtered.slice((page-1)*perPage, page*perPage)

  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex flex-col gap-3 bg-brand-light">
        <div className="grid md:grid-cols-6 gap-3">
          <input className="px-3 py-2 rounded-xl border bg-white md:col-span-2" placeholder="Cari deskripsi/kategori/user..." value={q} onChange={e=>{setQ(e.target.value); setPage(1)}} />
          <select value={type} onChange={e=>{setType(e.target.value as any); setPage(1)}} className="px-3 py-2 rounded-xl border bg-white">
            <option value="">Tipe: Semua</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
          <select value={brand} onChange={e=>{setBrand(e.target.value); setPage(1)}} className="px-3 py-2 rounded-xl border bg-white">
            <option value="">Brand: Semua</option>
            {brands.map(b=><option key={b} value={b}>{b}</option>)}
          </select>
          <input type="date" value={from} onChange={e=>{setFrom(e.target.value); setPage(1)}} className="px-3 py-2 rounded-xl border bg-white" />
          <input type="date" value={to} onChange={e=>{setTo(e.target.value); setPage(1)}} className="px-3 py-2 rounded-xl border bg-white" />
        </div>

        <div className="flex items-center gap-2 justify-end">
          <span className="text-sm text-slate-600">Rows:</span>
          <select value={perPage} onChange={e=>{setPerPage(Number(e.target.value)); setPage(1)}} className="px-2 py-1 rounded-lg border bg-white">
            {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-white">
            <tr className="text-left text-slate-500 text-sm">
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Scope</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Input By</th>        {/* ✅ */}
              <th className="px-4 py-3">Bukti</th>           {/* ✅ */}
              <th className="px-4 py-3 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3"><span className={`badge ${r.type==='income'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.type}</span></td>
                <td className="px-4 py-3">{r.category}</td>
                <td className="px-4 py-3">{r.scope}</td>
                <td className="px-4 py-3">{r.brand ?? '-'}</td>
                <td className="px-4 py-3">{r.description}</td>
                <td className="px-4 py-3">{r.channel ?? '-'}</td>
                <td className="px-4 py-3">{r.inputBy}</td>
                <td className="px-4 py-3">
                  {r.type==='expense' && r.proofUrl
                    ? <a className="text-brand underline" href={r.proofUrl} target="_blank" rel="noreferrer">Lihat</a>
                    : '-'}
                </td>
                <td className="px-4 py-3 text-right">Rp {r.amount.toLocaleString('id-ID')}</td>
              </tr>
            ))}
            {slice.length === 0 && (
              <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={10}>Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">Total: {filtered.length} rows</div>
        <div className="flex items-center gap-1">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} className="btn-secondary px-3 py-1">Prev</button>
          {Array.from({length: pages}).map((_,i)=>(
            <button key={i} onClick={()=>setPage(i+1)} className={`px-3 py-1 rounded-lg border ${page===i+1?'bg-brand text-white border-brand':'bg-white hover:bg-brand-light'}`}>{i+1}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} className="btn-secondary px-3 py-1">Next</button>
        </div>
      </div>
    </div>
  )
}
