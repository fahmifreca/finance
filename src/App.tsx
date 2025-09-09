import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Nav from "@/components/Nav";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

/** cache sederhana untuk share auth user ke komponen lain */
const cache = {
  user: null as any,
  subs: new Set<(u: any) => void>(),
};
function useAuthUser() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    cache.subs.add(fn);
    return () => cache.subs.delete(fn);
  }, []);
  return cache.user;
}

export default function App() {
  const user = useAuthUser();
  const [init, setInit] = useState(true);

  useEffect(() => {
    // DENGAN import statis; JANGAN pernah pakai "await import('react')" di mana pun
    const unsub = onAuthStateChanged(auth, (u) => {
      cache.user = u;
      cache.subs.forEach((fn) => fn(u));
      setInit(false);
    });
    return () => unsub();
  }, []);

  if (init) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-slate-600">Memuat…</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {user ? (
        <div className="min-h-screen flex flex-col">
          <Nav />
          <main className="flex-1 p-4 bg-slate-50">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="/*" element={<Login />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
