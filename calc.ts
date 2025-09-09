import type { Transaction } from '@/types'
import { parseISO, isWithinInterval, addMonths } from 'date-fns'

export type DateRange = { from?: string, to?: string }

export function inRange(dateISO: string, range?: DateRange) {
  if (!range?.from && !range?.to) return true
  const dt = parseISO(dateISO)
  const start = range?.from ? parseISO(range.from) : new Date('1970-01-01')
  const end = range?.to ? parseISO(range.to) : new Date('2999-12-31')
  return isWithinInterval(dt, { start, end })
}

export function filterRows(rows: Transaction[], range?: DateRange, type?: 'income'|'expense', brand?: string) {
  return rows.filter(r => inRange(r.date, range))
             .filter(r => !type || r.type === type)
             .filter(r => !brand || r.brand === brand)
}

/** ========== CASHFLOW (cash basis) ==========
 *  income: hanya yang revenueMode='actual'
 *  expense: semua expense di tanggal transaksinya (tak peduli amortisasi)
 */
export function cashflow(rows: Transaction[], range?: DateRange) {
  const inflow = rows
    .filter(r => r.type==='income' && r.revenueMode !== 'accrual')
    .filter(r => inRange(r.date, range))
    .reduce((a,b)=>a+b.amount,0)

  const outflow = rows
    .filter(r => r.type==='expense' && inRange(r.date, range))
    .reduce((a,b)=>a+b.amount,0)

  return { inflow, outflow, net: inflow - outflow }
}

/** Hitung beban akrual per transaksi expense yang diamortisasi
 * Mengembalikan total beban yang jatuh pada range.
 */
function amortizedExpenseInRange(t: Transaction, range?: DateRange) {
  if (t.type!=='expense' || !t.amortizeMonths || t.amortizeMonths<=0) return 0
  const start = parseISO(t.amortizeStart ?? t.date)
  const months = t.amortizeMonths
  const monthly = t.amount / months

  let total = 0
  for (let i=0;i<months;i++){
    const periodStart = addMonths(start, i)
    const iso = periodStart.toISOString()
    if (inRange(iso, range)) total += monthly
  }
  return total
}

/** ========== P/L AKRUAL ========== */
export function pnlAccrual(rows: Transaction[], range?: DateRange) {
  const income = rows
    .filter(r=> r.type==='income' && inRange(r.date, range))
    .reduce((a,b)=>a+b.amount,0)

  let expense = 0
  for (const r of rows) {
    if (r.type!=='expense') continue
    if (r.amortizeMonths && r.amortizeMonths>0) expense += amortizedExpenseInRange(r, range)
    else if (inRange(r.date, range)) expense += r.amount
  }

  return { income, expense, profit: income - expense }
}

/** ========== P/L AKTUAL (cash basis) ========== */
export function pnlActual(rows: Transaction[], range?: DateRange) {
  const income = rows
    .filter(r=> r.type==='income' && r.revenueMode !== 'accrual' && inRange(r.date, range))
    .reduce((a,b)=>a+b.amount,0)

  const expense = rows
    .filter(r=> r.type==='expense' && inRange(r.date, range))
    .reduce((a,b)=>a+b.amount,0)

  return { income, expense, profit: income - expense }
}

/** Ringkasan sederhana (dipakai KPI Dashboard) – berbasis cashflow */
export function summarize(rows: Transaction[], range?: DateRange) {
  const cf = cashflow(rows, range)
  return { income: cf.inflow, expense: cf.outflow, cashflow: cf.net }
}

/** ========== Ringkasan per Brand dengan alokasi Join Cost ==========
 * basis:
 *  - 'accrual' → income: semua pemasukan; expense brand: gunakan amortisasi jika ada
 *  - 'actual'  → income: hanya revenueMode != 'accrual'; expense brand: nilai penuh saat dibayar
 * Join cost (scope='join') dialokasikan proporsional terhadap total income brand.
 */
export function byBrand(
  rows: Transaction[],
  basis: 'accrual' | 'actual' = 'accrual',
  range?: DateRange
) {
  const brands = Array.from(new Set(rows.map(r=>r.brand).filter(Boolean))) as string[]

  // income per brand
  const incomeByBrand: Record<string, number> = {}
  for (const b of brands) {
    const inc = rows.filter(r =>
      r.type==='income' &&
      r.brand===b &&
      inRange(r.date, range) &&
      (basis==='accrual' ? true : r.revenueMode !== 'accrual')
    ).reduce((a,r)=>a+r.amount,0)
    incomeByBrand[b] = inc
  }
  const totalIncome = Object.values(incomeByBrand).reduce((a,b)=>a+b,0)

  // direct expense per brand
  const directByBrand: Record<string, number> = {}
  for (const b of brands) {
    let total = 0
    const items = rows.filter(r=> r.type==='expense' && r.scope==='brand' && r.brand===b)
    for (const it of items) {
      if (!inRange(it.date, range) && !(it.amortizeMonths && basis==='accrual')) continue
      if (basis==='accrual' && it.amortizeMonths && it.amortizeMonths>0) {
        total += amortizedExpenseInRange(it, range)
      } else if (inRange(it.date, range)) {
        total += it.amount
      }
    }
    directByBrand[b] = total
  }

  // join cost pool (scope='join')
  let joinPool = 0
  const joinItems = rows.filter(r=> r.type==='expense' && r.scope==='join')
  for (const it of joinItems) {
    if (basis==='accrual' && it.amortizeMonths && it.amortizeMonths>0) {
      joinPool += amortizedExpenseInRange(it, range)
    } else if (inRange(it.date, range)) {
      joinPool += it.amount
    }
  }

  // allocate join cost proporsional income
  const result = brands.map(b=>{
    const income = incomeByBrand[b] || 0
    const direct = directByBrand[b] || 0
    const share = totalIncome > 0 ? (income / totalIncome) : 0
    const joinAllocated = Math.round(joinPool * share)
    const profit = income - direct - joinAllocated
    return { brand: b, income, direct, joinAllocated, profit }
  })

  return result.sort((a,b)=>a.brand.localeCompare(b.brand))
}
