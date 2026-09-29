// Loaders for the exported federation run. Static files, fetched once per page.
import type { GalleryItem, RunFile } from "./contract";

let runP: Promise<RunFile> | null = null;
let galleryP: Promise<GalleryItem[]> | null = null;

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
  return r.json() as Promise<T>;
}

export function fetchRun(): Promise<RunFile> {
  runP ??= getJson<RunFile>("/fl/run.json");
  return runP;
}

export function fetchGallery(): Promise<GalleryItem[]> {
  galleryP ??= getJson<GalleryItem[]>("/fl/gallery.json");
  return galleryP;
}

export const pct = (v: number | null | undefined, digits = 0) =>
  v == null ? "—" : `${(v * 100).toFixed(digits)}%`;

/** A model probability for display: never "100%" or "0%" — softmax outputs are neither. */
export const prob = (v: number) => (v >= 0.995 ? "above 99%" : v < 0.005 ? "below 1%" : `${Math.round(v * 100)}%`);

export const bytesLabel = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : n >= 1000 ? `${Math.round(n / 1000)} KB` : `${n} B`;

export const grouped = (n: number) => n.toLocaleString("en-US");
