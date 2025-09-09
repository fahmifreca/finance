export type TxType = 'income' | 'expense'
export type Scope = 'global' | 'brand' | 'join'
export type Channel = 'shopee' | 'tiktok'

/** Laporan & RBAC (dari versi sebelumnya) */
export type RouteId = 'dashboard' | 'transactions' | 'reports' | 'admin'
export interface RoleDef { name: string; permissions: RouteId[] }

/** Metode pengakuan pemasukan */
export type RevenueMode = 'accrual' | 'actual'

export interface Transaction {
  id: string
  date: string            // ISO
  type: TxType
  category: string
  description?: string
  amount: number

  /** ruang lingkup transaksi:
   * - 'brand'  : khusus 1 brand (isi field brand)
   * - 'join'   : join cost (bisa target brand tertentu via joinTargets)
   * - 'global' : berlaku umum (tanpa brand)
   */
  scope: Scope
  brand?: string

  /** daftar brand yang ikut join cost (khusus scope==='join').
   *  jika diisi, alokasi hanya ke brand-brand ini.
   *  jika tidak diisi atau array kosong, diasumsikan semua brand ikut.
   */
  joinTargets?: string[]

  channel?: Channel

  // dari fitur sebelumnya
  proofUrl?: string
  inputBy: string

  // ====== BARU ======
  /** hanya untuk pemasukan */
  revenueMode?: RevenueMode

  /** hanya untuk pengeluaran: jika diisi, beban di L/R akrual dibagi rata per bulan */
  amortizeMonths?: number            // contoh: 24 (bulan)
  amortizeStart?: string             // ISO, default = date transaksi
}
