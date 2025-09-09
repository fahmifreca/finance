// src/lib/storage.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Transaction, Channel, RoleDef, RouteId } from "@/types";

import {
  listenTransactions, addTransaction, updateTransaction as fbUpdateTx, removeTransaction as fbDeleteTx,
  listenArray, listenDoc, saveSettings, colBrands, colChannels, colCatIncome, colCatExpense, colUsers, colRoles,
  upsertListItem, deleteListItem, docSettings, createIfMissing
} from "@/lib/db";

const ONLINE = String(import.meta.env.VITE_ONLINE || "0") === "1";

type AppSettings = { appName: string; logoUrl?: string };
type UserLite = { id: string; name: string; role: string };

type Store = {
  // state
  transactions: Transaction[];
  brands: string[];
  channels: Channel[];
  categoriesIncome: string[];
  categoriesExpense: string[];
  users: UserLite[];
  roles: RoleDef[];
  settings: AppSettings;
  currentUserId?: string;

  // flags
  readyOnline: boolean;

  // actions
  addTx: (t: Transaction) => void;
  updateTx: (t: Transaction) => void;
  deleteTx: (id: string) => void;
  bulkSeed: (rows: Transaction[]) => void; // dipakai offline

  addBrand: (name: string) => void;
  removeBrand: (name: string) => void;
  addChannel: (name: Channel) => void;
  removeChannel: (name: Channel) => void;
  addCategoryIncome: (name: string) => void;
  removeCategoryIncome: (name: string) => void;
  addCategoryExpense: (name: string) => void;
  removeCategoryExpense: (name: string) => void;

  addUser: (name: string, role: string) => void;
  removeUser: (id: string) => void;
  setUserRole: (id: string, role: string) => void;

  addRole: (name: string, perms: RouteId[]) => void;
  updateRole: (name: string, perms: RouteId[]) => void;
  removeRole: (name: string) => void;

  setSettings: (s: Partial<AppSettings>) => void;
  setCurrentUser: (id: string) => void;

  // init
  __initOnline: () => void;
};

// util id
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      transactions: [],
      brands: ["Ghazal", "Sultan Kasturi", "Inflame"],
      channels: ["shopee", "tiktok"],
      categoriesIncome: ["Sales", "Other Income"],
      categoriesExpense: ["Operational", "Gaji", "Iklan", "Sewa", "Utilitas", "COGS"],

      roles: [
        { name: "admin", permissions: ["dashboard", "transactions", "reports", "admin"] },
        { name: "editor", permissions: ["dashboard", "transactions", "reports"] },
        { name: "viewer", permissions: ["dashboard", "reports"] },
        { name: "kepala_gudang", permissions: ["dashboard", "transactions", "reports"] },
      ],
      users: [{ id: uid(), name: "Owner", role: "admin" }],
      settings: { appName: "Fintrack Pro", logoUrl: "" },
      currentUserId: undefined,

      readyOnline: !ONLINE, // kalau offline: langsung ready

      // ===== Transactions =====
      addTx: (t) => {
        if (ONLINE) {
          const { id, ...rest } = t as any;
          addTransaction(rest);
        } else {
          set((s) => ({ transactions: [t, ...s.transactions] }));
        }
      },
      updateTx: (t) => {
        if (ONLINE) fbUpdateTx(t);
        else set((s) => ({ transactions: s.transactions.map((x) => (x.id === t.id ? t : x)) }));
      },
      deleteTx: (id) => {
        if (ONLINE) fbDeleteTx(id);
        else set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) }));
      },
      bulkSeed: (rows) => set(() => ({ transactions: rows })),

      // ===== Master data small lists =====
      addBrand: (name) => {
        if (ONLINE) upsertListItem(colBrands, name, { name });
        else set((s) => ({ brands: [...s.brands.filter((b) => b !== name), name] }));
      },
      removeBrand: (name) => {
        if (ONLINE) deleteListItem(colBrands, name);
        else set((s) => ({ brands: s.brands.filter((b) => b !== name) }));
      },

      addChannel: (name) => {
        if (ONLINE) upsertListItem(colChannels, name, { name });
        else set((s) => ({ channels: [...new Set([...s.channels, name])] as any }));
      },
      removeChannel: (name) => {
        if (ONLINE) deleteListItem(colChannels, name);
        else set((s) => ({ channels: s.channels.filter((c) => c !== name) }));
      },

      addCategoryIncome: (name) => {
        if (ONLINE) upsertListItem(colCatIncome, name, { name });
        else set((s) => ({ categoriesIncome: [...new Set([...s.categoriesIncome, name])] }));
      },
      removeCategoryIncome: (name) => {
        if (ONLINE) deleteListItem(colCatIncome, name);
        else set((s) => ({ categoriesIncome: s.categoriesIncome.filter((c) => c !== name) }));
      },

      addCategoryExpense: (name) => {
        if (ONLINE) upsertListItem(colCatExpense, name, { name });
        else set((s) => ({ categoriesExpense: [...new Set([...s.categoriesExpense, name])] }));
      },
      removeCategoryExpense: (name) => {
        if (ONLINE) deleteListItem(colCatExpense, name);
        else set((s) => ({ categoriesExpense: s.categoriesExpense.filter((c) => c !== name) }));
      },

      // ===== Users & Roles (opsional online) =====
      addUser: (name, role) =>
        set((s) => ({ users: [...s.users, { id: uid(), name, role }] })),
      removeUser: (id) =>
        set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
      setUserRole: (id, role) =>
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) })),

      addRole: (name, perms) =>
        set((s) => ({ roles: [...s.roles.filter((r) => r.name !== name), { name, permissions: perms }] })),
      updateRole: (name, perms) =>
        set((s) => ({ roles: s.roles.map((r) => (r.name === name ? { ...r, permissions: perms } : r)) })),
      removeRole: (name) =>
        set((s) => ({ roles: s.roles.filter((r) => r.name !== name) })),

      // ===== Settings =====
      setSettings: (patch) => {
        if (ONLINE) saveSettings(patch);
        set((s) => ({ settings: { ...s.settings, ...patch } }));
      },

      setCurrentUser: (id) => set(() => ({ currentUserId: id })),

      // ===== Init Firestore listeners =====
      __initOnline: () => {
        if (!ONLINE || get().readyOnline) return;

        // pastikan dokumen settings ada (muncul "This document does not exist" di console kamu)
        createIfMissing();

        // transactions
        const unsubTx = listenTransactions((rows) => set(() => ({ transactions: rows })));

        // brands / channels / categories
        const u1 = listenArray(colBrands, (d) => ({ id: d.id, ...d.data() }), (arr) =>
          set(() => ({ brands: arr.map((x) => x.id as string) }))
        );
        const u2 = listenArray(colChannels, (d) => ({ id: d.id, ...d.data() }), (arr) =>
          set(() => ({ channels: arr.map((x) => x.id as any) }))
        );
        const u3 = listenArray(colCatIncome, (d) => ({ id: d.id, ...d.data() }), (arr) =>
          set(() => ({ categoriesIncome: arr.map((x) => x.id as string) }))
        );
        const u4 = listenArray(colCatExpense, (d) => ({ id: d.id, ...d.data() }), (arr) =>
          set(() => ({ categoriesExpense: arr.map((x) => x.id as string) }))
        );

        // settings
        const u5 = listenDoc(docSettings, (data) => {
          if (data) set(() => ({ settings: { appName: data.appName || "Fintrack Pro", logoUrl: data.logoUrl || "" } }));
        });

        // (optional) users & roles – tetap pakai local jika belum perlu
        const u6 = listenArray(colUsers, (d) => ({ id: d.id, ...d.data() }), (arr) => {
          if (arr.length) set(() => ({ users: arr as any }));
        });
        const u7 = listenArray(colRoles, (d) => ({ id: d.id, ...d.data() }), (arr) => {
          if (arr.length) {
            const roles = arr.map((x: any) => ({ name: x.id, permissions: x.permissions || [] }));
            set(() => ({ roles }));
          }
        });

        set({ readyOnline: true });

        // (opsional) return fungsi untuk dipakai kalau mau unsubscribe saat teardown
        // tapi untuk SPA ini tidak dibutuhkan saat runtime
        void [unsubTx, u1, u2, u3, u4, u5, u6, u7];
      },
    }),
    { name: "fintrack-store-v2" }
  )
);

/** Dipanggil sekali (mis. di App.tsx) setelah auth siap */
export const initOnlineStore = () => {
  const s = useStore.getState();
  s.__initOnline();
};
