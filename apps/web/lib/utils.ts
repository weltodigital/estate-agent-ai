import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const usd = new Intl.NumberFormat("en-GB", { style: "currency", currency: "USD", maximumFractionDigits: 3 });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
export const formatPence = (pence: number) => gbp.format(pence / 100);
export const formatUsd = (v: number | string | null | undefined) => (v === null || v === undefined ? "—" : usd.format(Number(v)));

export function appUrl(path = "") {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${path}`;
}
