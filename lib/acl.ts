import { useStore } from '@/lib/storage'
import type { RouteId } from '@/types'

export const ROUTES: { id: RouteId; path: string; label: string }[] = [
  { id: 'dashboard',    path: '/',             label: 'Dashboard' },
  { id: 'transactions', path: '/transactions', label: 'Transaksi' },
  { id: 'reports',      path: '/reports',      label: 'Laporan' },
  { id: 'admin',        path: '/admin',        label: 'Admin' },
]

export function useCanAccess(route: RouteId) {
  const users  = useStore(s=>s.users)
  const roles  = useStore(s=>s.roles)
  const curId  = useStore(s=>s.currentUserId)
  const user = users.find(u=>u.id===curId) ?? users[0]
  const role = roles.find(r=>r.name===user?.role)
  return !!role?.permissions.includes(route)
}
