// src/pages/Login.tsx
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/storage";

export default function Login() {
  const { loginWithEmail } = useAuth();

  // Ambil nama & logo dari pengaturan (bisa diubah dari halaman Admin)
  const appName = useStore((s) => s.settings.appName) || "Financial Manager";
  const logoUrl = useStore((s) => s.settings.logoUrl) || "";
  const subtitle =
    useStore((s) => (s.settings as any)?.tagline) ||
    `Dashboard ${appName} Indonesia`;

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !pass) return setErr("Email dan password wajib diisi.");
    setErr(null);
    setLoading(true);
    try {
      await loginWithEmail(email.trim(), pass);
      // sukses -> auth listener di App.tsx akan redirect ke app
    } catch (e: any) {
      setErr(e?.message || "Gagal masuk. Periksa email/password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-2xl text-center mb-6">
        {/* Logo bulat di atas judul */}
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm">
          {logoUrl ? (
            <img
              src={logoUrl}
              className="h-16 w-16 rounded-2xl object-cover"
              alt="logo"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-blue-600 text-white grid place-items-center">
              <span className="text-2xl">₹</span>
            </div>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          {appName}
        </h1>
        <p className="mt-2 text-slate-500">{subtitle}</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-xl border border-slate-100"
      >
        <div className="space-y-5">
          {/* Email */}
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </span>
            <input
              type="email"
              className="w-full rounded-2xl h-12 px-4 bg-slate-50 outline-none border border-transparent focus:border-blue-400 transition"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </label>

          {/* Password + eye toggle */}
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </span>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                className="w-full rounded-2xl h-12 pl-4 pr-12 bg-slate-50 outline-none border border-transparent focus:border-blue-400 transition"
                placeholder="Password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
              <button
                type="button"
                aria-label={show ? "Sembunyikan password" : "Lihat password"}
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {/* Ikon mata */}
                {show ? (
                  // eye-off
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0113.42 13.4M9.88 4.24A10.94 10.94 0 0121 12a10.94 10.94 0 01-2.1 3.36M6.3 6.3A10.94 10.94 0 003 12a10.94 10.94 0 0011 7 10.94 10.94 0 003.36-2.1" />
                  </svg>
                ) : (
                  // eye
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {/* Error */}
          {err && (
            <div className="rounded-xl bg-red-50 text-red-700 text-sm px-3 py-2">
              {err}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </form>
    </div>
  );
}
