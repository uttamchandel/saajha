// Escalation tickets for the state expert's review queue.
// They live in this browser's localStorage only: no server, no database, and no farmer
// names, villages or phone numbers — just the two model verdicts and why they were escalated.
// In a real deployment the ticket would go to the state's KVK expert queue.
import { isClassKey, isDiagnosisKey, type ClassKey, type DiagnosisKey } from "./classes";
import type { StateId } from "./contract";

export interface Ticket {
  id: string;
  createdAt: string; // ISO timestamp
  stateId: StateId;
  /** null when Gemini was unavailable. */
  geminiLabel: DiagnosisKey | null;
  /** 0-100, null when Gemini was unavailable. */
  geminiConfidence: number | null;
  fedLabel: ClassKey;
  /** 0-100 (calibrated probability x 100). */
  fedConfidence: number;
  reason: string;
  status: "pending";
}

const KEY = "saajha.tickets.v1";
const EVENT = "saajha:tickets";
const MAX = 50;

/** Parse the stored list; anything malformed is dropped. */
export function parseTickets(raw: string | null): Ticket[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed.filter(
          (t) =>
            t &&
            typeof t === "object" &&
            typeof t.id === "string" &&
            isClassKey(t.fedLabel) &&
            (t.geminiLabel === null || isDiagnosisKey(t.geminiLabel)),
        ) as Ticket[])
      : [];
  } catch {
    return [];
  }
}

/** The raw stored string: a stable snapshot for useSyncExternalStore (strings compare by value). */
export function ticketsSnapshot(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function read(): Ticket[] {
  return parseTickets(ticketsSnapshot());
}

function write(list: Ticket[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch {
    return false;
  } finally {
    try {
      window.dispatchEvent(new Event(EVENT));
    } catch {
      /* no window */
    }
  }
}

export function listTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  return read();
}

function newId(stateId: StateId): string {
  let rand = "";
  try {
    rand = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  } catch {
    rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  }
  return `${stateId}-${rand}`;
}

/** Adds a ticket; returns it, plus whether this browser could store it. */
export function addTicket(t: Omit<Ticket, "id" | "createdAt" | "status">): { ticket: Ticket; stored: boolean } {
  const ticket: Ticket = { ...t, id: newId(t.stateId), createdAt: new Date().toISOString(), status: "pending" };
  if (typeof window === "undefined") return { ticket, stored: false };
  const stored = write([ticket, ...read()]);
  return { ticket, stored };
}

export function clearTickets(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* no window */
  }
}

/** Subscribe to changes from this tab (custom event) and other tabs (storage event). */
export function subscribeTickets(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
