import { Link, NavLink } from "react-router-dom";
import { useStore } from "@/lib/storage";
import { useCanAccess } from "@/lib/acl";
import { useAuth } from "@/lib/auth";

export default function Nav() {
  const appName = useStore((s) => s.settings.appName);
  const logo = useStore((s) => s.settings.logoUrl);

  const canDash = useCanAccess("dashboard");
  const canTx = useCanAccess("transactions");
  const canRpt = useCanAccess("reports");
  const canAdm = useCanAccess("admin");

  const { logout } = useAuth();

  const NavItem = ({ to, children }: any) => (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-4 py-2 rounded-xl transition ${
          isActive
            ? "bg-brand text-white"
            : "text-slate-600 hover:bg-brand-light"
        }`
      }
    >
      {children}
    </NavLink>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo + App name */}
        <Link to="/" className="flex items-center gap-2">
          {logo ? (
            <img
              src={logo}
              className="h-9 w-9 rounded-2xl object-cover"
              alt="logo"
            />
          ) : (
            <div className="h-9 w-9 rounded-2xl bg-brand flex items-center justify-center text-white font-bold">
              F
            </div>
          )}
          <span className="font-semibold">{appName}</span>
        </Link>

        {/* Nav items */}
        <nav className="flex items-center gap-2">
          {canDash && <NavItem to="/">Dashboard</NavItem>}
          {canTx && <NavItem to="/transactions">Transaksi</NavItem>}
          {canRpt && <NavItem to="/reports">Laporan</NavItem>}
          {canAdm && <NavItem to="/admin">Admin</NavItem>}
          {/* Tombol Logout di sebelah Admin */}
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-red-600 text-white hover:bg-red-700"
            title="Keluar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
