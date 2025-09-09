import Card from '@/components/Card'
import { useStore } from '@/lib/storage'
import { useMemo, useState } from 'react'
import type { RouteId } from '@/types'

/** ===== Tabs simple ===== */
const TAB_LIST = [
  { key: 'brand',    label: 'Kelola Brand',        icon: '📦' },
  { key: 'kategori', label: 'Kelola Kategori',     icon: '🗂️' },
  { key: 'channel',  label: 'Kelola Channel',      icon: '🛒' },
  { key: 'user',     label: 'Kelola User',         icon: '👥' },
  { key: 'role',     label: 'Manajemen Peran',     icon: '🔐' },
  { key: 'app',      label: 'Pengaturan Perusahaan', icon: '🏢' },
] as const
type TabKey = typeof TAB_LIST[number]['key']

/** ===== Confirm Modal (reusable) ===== */
function ConfirmModal({
  open, title, message, confirmText='Lanjut', cancelText='Batal', onConfirm, onClose
}:{
  open:boolean; title:string; message?:string; confirmText?:string; cancelText?:string;
  onConfirm:()=>void; onClose:()=>void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-card border border-slate-100">
        <div className="p-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          {message && <p className="mt-2 text-slate-600">{message}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary px-4 py-2" onClick={onClose}>{cancelText}</button>
            <button className="btn px-4 py-2" onClick={()=>{onConfirm(); onClose();}}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState<TabKey>('brand')

  // modal global
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [msg, setMsg] = useState<string|undefined>(undefined)
  const actionRef = useState<() => void>(()=>()=>{})[0]
  const ask = (t:string, m:string, fn:()=>void) => { setTitle(t); setMsg(m); (actionRef as any).current = fn; setOpen(true) }
  const onConfirm = () => { (actionRef as any).current?.() }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Tabs header */}
      <div className="card p-2">
        <div className="flex gap-2 overflow-x-auto">
          {TAB_LIST.map(t=>(
            <button key={t.key}
              onClick={()=>setTab(t.key)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap ${tab===t.key ? 'bg-brand text-white' : 'bg-brand-light text-slate-700 hover:bg-slate-100'}`}>
              <span className="mr-2">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {tab==='brand'    && <ManageBrands ask={ask} />}
      {tab==='kategori' && <ManageCategories ask={ask} />}
      {tab==='channel'  && <ManageChannels ask={ask} />}   {/* ← hanya SATU deklarasi di file ini */}
      {tab==='user'     && <ManageUsers ask={ask} />}
      {tab==='role'     && <ManageRoles ask={ask} />}
      {tab==='app'      && <ManageSettings ask={ask} />}

      <ConfirmModal open={open} title={title} message={msg} onConfirm={onConfirm} onClose={()=>setOpen(false)} />
    </div>
  )
}

/** ===== Kelola Aplikasi ===== */
function ManageSettings({ ask }: { ask: (t: string, m: string, ok: () => void) => void }) {
  const settings = useStore(s=>s.settings)
  const setSettings = useStore(s=>s.setSettings)
  const [name, setName] = useState(settings.appName)
  const [logo, setLogo] = useState(settings.logoUrl || '')
  const hasChanges = useMemo(() =>
    name !== settings.appName || (logo || '') !== (settings.logoUrl || ''), [name, logo, settings]
  )
  const save = () => setSettings({ appName: name, logoUrl: logo })
  return (
    <Card title="Pengaturan Perusahaan" right={
      <button className="btn disabled:opacity-50" disabled={!hasChanges}
        onClick={()=>ask('Yakin simpan perubahan?','Nama/logo aplikasi akan diperbarui.', save)}>
        Simpan
      </button>
    }>
      <div className="grid md:grid-cols-2 gap-3">
        <input className="input" placeholder="Nama aplikasi" value={name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="URL logo (opsional)" value={logo} onChange={e=>setLogo(e.target.value)} />
      </div>
    </Card>
  )
}

/** ===== Kelola Brand ===== */
function ManageBrands({ ask }: { ask: (t: string, m: string, ok: () => void) => void }) {
  const brands = useStore(s=>s.brands)
  const addBrand = useStore(s=>s.addBrand)
  const removeBrand = useStore(s=>s.removeBrand)
  const [txt, setTxt] = useState('')
  const doRemove = (name: string) => ask(`Yakin mau hapus brand ${name}?`,'Data transaksi existing tidak diubah.', ()=>removeBrand(name))
  return (
    <Card title="Kelola Brand">
      <div className="flex gap-2 mb-3">
        <input className="input flex-1" placeholder="Nama brand baru" value={txt} onChange={e=>setTxt(e.target.value)} />
        <button className="btn" onClick={()=>{ if(txt.trim()) { addBrand(txt.trim()); setTxt('') }}}>Tambah</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {brands.map(b=>(
          <span key={b} className="badge bg-brand-light text-brand border border-brand">
            {b}
            <button className="ml-2 text-slate-500" onClick={()=>doRemove(b)}>✕</button>
          </span>
        ))}
      </div>
    </Card>
  )
}

/** ===== Kelola Channel (TAB tersendiri) ===== */
function ManageChannels({ ask }: { ask: (t: string, m: string, ok: () => void) => void }) {
  const channels = useStore(s=>s.channels)
  const add = useStore(s=>s.addChannel)
  const remove = useStore(s=>s.removeChannel)
  const [txt, setTxt] = useState('')

  const doRemove = (name: string) =>
    ask(`Yakin mau hapus channel ${name}?`,'Channel tidak akan muncul saat input pemasukan.', ()=>remove(name as any))

  return (
    <Card title="Kelola Channel">
      <div className="flex gap-2 mb-3">
        <input className="input flex-1" placeholder="Contoh: shopee / tiktok" value={txt} onChange={e=>setTxt(e.target.value)} />
        <button className="btn" onClick={()=>{ if(txt.trim()) { add(txt.trim() as any); setTxt('') }}}>Tambah</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {channels.map(c=>(
          <span key={c} className="badge bg-brand-light text-brand border border-brand">
            {c}
            <button className="ml-2 text-slate-500" onClick={()=>doRemove(c)}>✕</button>
          </span>
        ))}
      </div>
    </Card>
  )
}

/** ===== Kelola Kategori ===== */
function ManageCategories({ ask }: { ask: (t: string, m: string, ok: () => void) => void }) {
  const inc = useStore(s=>s.categoriesIncome)
  const exp = useStore(s=>s.categoriesExpense)
  const addI = useStore(s=>s.addCategoryIncome)
  const addE = useStore(s=>s.addCategoryExpense)
  const remI = useStore(s=>s.removeCategoryIncome)
  const remE = useStore(s=>s.removeCategoryExpense)
  const [i, setI] = useState('')
  const [e, setE] = useState('')

  const confirmRemoveI = (name: string) => ask(`Yakin mau hapus kategori pemasukan "${name}"?`,'Kategori tidak tersedia lagi.', ()=>remI(name))
  const confirmRemoveE = (name: string) => ask(`Yakin mau hapus kategori pengeluaran "${name}"?`,'Kategori tidak tersedia lagi.', ()=>remE(name))

  return (
    <Card title="Kelola Kategori">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="font-medium mb-2">Pemasukan</div>
          <div className="flex gap-2 mb-2">
            <input className="input flex-1" placeholder="Tambah kategori pemasukan" value={i} onChange={e=>setI(e.target.value)} />
            <button className="btn" onClick={()=>{ if(i.trim()) { addI(i.trim()); setI('') }}}>Tambah</button>
          </div>
          <div className="flex flex-wrap gap-2">{inc.map(x=>(<span key={x} className="badge bg-green-100 text-green-700">{x}<button className="ml-2" onClick={()=>confirmRemoveI(x)}>✕</button></span>))}</div>
        </div>
        <div>
          <div className="font-medium mb-2">Pengeluaran</div>
          <div className="flex gap-2 mb-2">
            <input className="input flex-1" placeholder="Tambah kategori pengeluaran" value={e} onChange={ev=>setE(ev.target.value)} />
            <button className="btn" onClick={()=>{ if(e.trim()) { addE(e.trim()); setE('') }}}>Tambah</button>
          </div>
          <div className="flex flex-wrap gap-2">{exp.map(x=>(<span key={x} className="badge bg-red-100 text-red-700">{x}<button className="ml-2" onClick={()=>confirmRemoveE(x)}>✕</button></span>))}</div>
        </div>
      </div>
    </Card>
  )
}

/** ===== Kelola User ===== */
function ManageUsers({ ask }: { ask: (t: string, m: string, ok: () => void) => void }) {
  const users = useStore(s=>s.users)
  const roles = useStore(s=>s.roles)
  const add = useStore(s=>s.addUser)
  const remove = useStore(s=>s.removeUser)
  const setCurrent = useStore(s=>s.setCurrentUser)
  const setUserRole = useStore(s=>s.setUserRole)
  const currentUserId = useStore(s=>s.currentUserId)

  const [name, setName] = useState('')
  const [role, setRole] = useState<string>(roles[0]?.name || 'viewer')

  const doRemove = (id: string, nm: string) => ask(`Yakin mau hapus user ${nm}?`,'User ini akan dihapus.', ()=>remove(id))
  const makeActive = (id: string, nm: string) => ask(`Jadikan ${nm} sebagai user aktif?`,'Transaksi baru akan terisi Input By sesuai user ini.', ()=>setCurrent(id))

  return (
    <Card title="Kelola User">
      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <input className="input" placeholder="Nama user" value={name} onChange={e=>setName(e.target.value)} />
        <select className="select" value={role} onChange={e=>setRole(e.target.value)}>
          {roles.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}
        </select>
        <button className="btn" onClick={()=>{ if(name.trim()) { add(name.trim(), role); setName('') }}}>Tambah User</button>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[720px]">
          <thead className="text-left text-sm text-slate-500">
            <tr><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Peran</th><th className="px-4 py-2">Aksi</th></tr>
          </thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.name} {u.id===currentUserId && <span className="badge bg-brand-light text-brand border border-brand ml-2">aktif</span>}</td>
                <td className="px-4 py-2">
                  <select className="select" value={u.role} onChange={e=>setUserRole(u.id, e.target.value)}>
                    {roles.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button className="btn-secondary" onClick={()=>doRemove(u.id, u.name)}>Hapus</button>
                  <button className="btn-secondary" onClick={()=>makeActive(u.id, u.name)}>Jadikan aktif</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** ===== Manajemen Peran (RBAC) ===== */
function ManageRoles({ ask }: { ask: (t: string, m: string, ok: () => void) => void }) {
  const roles = useStore(s=>s.roles)
  const addRole = useStore(s=>s.addRole)
  const updateRole = useStore(s=>s.updateRole)
  const removeRole = useStore(s=>s.removeRole)

  const ROUTES: { id: RouteId; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Transaksi' },
    { id: 'reports', label: 'Laporan' },
    { id: 'admin', label: 'Admin' },
  ]

  const [name, setName] = useState('')
  const [perms, setPerms] = useState<RouteId[]>(['dashboard'])
  const toggle = (id: RouteId) => setPerms(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])

  const onCreate = () => addRole(name.trim(), perms)
  const del = (nm: string) => ask(`Hapus peran ${nm}?`, 'User dengan peran ini tetap ada, tapi perannya tidak dikenali.', ()=>removeRole(nm))
  const saveExisting = (nm: string, ps: RouteId[]) => updateRole(nm, ps)

  return (
    <Card title="Manajemen Peran (RBAC)">
      {/* tambah peran */}
      <div className="mb-6">
        <div className="grid md:grid-cols-3 gap-3 items-start">
          <input className="input" placeholder="Nama peran (mis. kepala_gudang)" value={name} onChange={e=>setName(e.target.value)} />
          <div className="card p-3">
            <div className="text-sm font-medium mb-2">Akses halaman</div>
            <div className="flex flex-wrap gap-2">
              {ROUTES.map(r=>(
                <label key={r.id} className={`px-3 py-2 rounded-xl border cursor-pointer ${perms.includes(r.id)?'bg-brand text-white border-brand':'bg-white hover:bg-slate-50'}`}>
                  <input type="checkbox" className="mr-2" checked={perms.includes(r.id)} onChange={()=>toggle(r.id)} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <button className="btn" onClick={()=> name.trim() && onCreate()}>Tambah Peran</button>
        </div>
      </div>

      {/* daftar peran */}
      <div className="overflow-auto">
        <table className="w-full min-w-[720px]">
          <thead className="text-left text-sm text-slate-500">
            <tr><th className="px-4 py-2">Peran</th><th className="px-4 py-2">Akses</th><th className="px-4 py-2">Aksi</th></tr>
          </thead>
          <tbody>
            {roles.map(r=>{
              const local = new Set(r.permissions)
              const toggleExisting = (id: RouteId) => {
                if (local.has(id)) local.delete(id); else local.add(id)
                saveExisting(r.name, Array.from(local))
              }
              return (
                <tr key={r.name} className="border-t">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {['dashboard','transactions','reports','admin'].map(rt=>(
                        <label key={rt} className={`px-3 py-2 rounded-xl border cursor-pointer ${local.has(rt as RouteId)?'bg-brand text-white border-brand':'bg-white hover:bg-slate-50'}`}>
                          <input type="checkbox" className="mr-2" checked={local.has(rt as RouteId)} onChange={()=>toggleExisting(rt as RouteId)} />
                          {ROUTES.find(x=>x.id===rt as RouteId)?.label}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <button className="btn-secondary" onClick={()=>del(r.name)}>Hapus</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
