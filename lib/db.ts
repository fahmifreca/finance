// src/lib/db.ts
import {
  getFirestore, collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy
} from "firebase/firestore";
import { app } from "@/lib/firebase"; // pastikan firebase.ts export { app }
import type { Transaction } from "@/types";

const db = getFirestore(app);
const APP_ID = import.meta.env.VITE_APP_ID || "default";

/** Paths di bawah apps/{APP_ID} */
const appDoc = doc(db, "apps", APP_ID);
export const colBrands            = collection(appDoc, "brands");
export const colChannels          = collection(appDoc, "channels");
export const colCatIncome         = collection(appDoc, "categoriesIncome");
export const colCatExpense        = collection(appDoc, "categoriesExpense");
export const colUsers             = collection(appDoc, "users");
export const colRoles             = collection(appDoc, "roles");
export const docSettings          = doc(appDoc, "settings", "app");
export const colTransactions      = collection(appDoc, "transactions");

/** Helpers CRUD */
export const listenArray = <T extends { id?: string }>(
  colRef: any,
  mapFn?: (d: any) => T,
  cb?: (arr: T[]) => void
) => onSnapshot(colRef, (snap) => {
  const arr: T[] = [];
  snap.forEach((d: any) => arr.push({ id: d.id, ...(mapFn ? mapFn(d) : d.data()) }));
  cb?.(arr);
});

export const listenDoc = (docRef: any, cb: (data: any) => void) =>
  onSnapshot(docRef, (snap) => cb(snap.exists() ? snap.data() : null));

export const createIfMissing = async () => {
  // Bikin dokumen settings awal kalau belum ada
  const unsub = onSnapshot(docSettings, async (snap) => {
    if (!snap.exists()) {
      await setDoc(docSettings, {
        appName: "Fintrack Pro",
        logoUrl: "",
        updatedAt: serverTimestamp(),
      });
    }
    unsub();
  });
};

/** Transactions */
export const listenTransactions = (cb: (rows: Transaction[]) => void) => {
  const q = query(colTransactions, orderBy("date", "desc"));
  return onSnapshot(q, (snap) => {
    const arr: Transaction[] = [];
    snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
    cb(arr);
  });
};

export const addTransaction = async (t: Omit<Transaction, "id">) => {
  await addDoc(colTransactions, { ...t, createdAt: serverTimestamp() });
};
export const updateTransaction = async (t: Transaction) => {
  if (!t.id) return;
  await updateDoc(doc(colTransactions, t.id), { ...t, updatedAt: serverTimestamp() });
};
export const removeTransaction = async (id: string) => {
  await deleteDoc(doc(colTransactions, id));
};

/** Settings */
export const saveSettings = async (patch: any) => {
  await setDoc(docSettings, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
};

/** Generic add/remove for small list collections (brands, channels, categories) */
export const upsertListItem = async (colRef: any, id: string, data: any) =>
  setDoc(doc(colRef, id), data, { merge: true });
export const deleteListItem = async (colRef: any, id: string) =>
  deleteDoc(doc(colRef, id));
