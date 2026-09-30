// Hand-drawn stroke icons for the landing's lower sections (lucide is not a dependency of the hub).
// Every icon is decorative: the text beside it carries the meaning, so all are aria-hidden.
import css from "./sections.module.css";

type IconProps = { className?: string };

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function ArrowRight({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...STROKE} strokeWidth={2}>
      <path d="M4.5 12h14.5" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </svg>
  );
}

export function ArrowDown({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...STROKE} strokeWidth={2}>
      <path d="M12 4.5V19" />
      <path d="m6.5 13.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}

export function ArrowUpRight({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...STROKE} strokeWidth={2}>
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </svg>
  );
}

export function Tick({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...STROKE} strokeWidth={2.5}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function Lock({ className = "size-4" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} {...STROKE} strokeWidth={2}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
      <path d="M12 14.5v2" />
    </svg>
  );
}

/** Voice call: a handset. */
export function PhoneIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className} {...STROKE}>
      <path d="M9.2 4.5h3.6l1.9 5.2-2.6 1.9a14.5 14.5 0 0 0 8.3 8.3l1.9-2.6 5.2 1.9v3.6a2.6 2.6 0 0 1-2.8 2.6C14.9 24.7 7.3 17.1 6.6 7.3a2.6 2.6 0 0 1 2.6-2.8Z" />
      <path d="M19.5 5.5a8 8 0 0 1 7 7" />
      <path d="M19 9.8a4 4 0 0 1 3.2 3.2" />
    </svg>
  );
}

/** SMS: a keypad phone, the kind most SMS users carry. */
export function SmsIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className} {...STROKE}>
      <rect x="9.5" y="3.5" width="13" height="25" rx="2.5" />
      <rect x="12.5" y="7" width="7" height="6" rx="1" />
      <path d="M13 17h.01M16 17h.01M19 17h.01M13 20.5h.01M16 20.5h.01M19 20.5h.01M13 24h.01M16 24h.01M19 24h.01" strokeWidth={2.4} />
    </svg>
  );
}

/** Chat: a speech bubble (WhatsApp's own mark is not ours to draw). */
export function ChatIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className} {...STROKE}>
      <path d="M26.5 15.2c0 5.7-4.9 10.3-10.9 10.3-1.7 0-3.3-.4-4.8-1l-5.3 1.8 1.6-4.6a9.8 9.8 0 0 1-2.4-6.5C4.7 9.5 9.6 5 15.6 5s10.9 4.5 10.9 10.2Z" />
      <path d="M11.2 15.3h.01M15.6 15.3h.01M20 15.3h.01" strokeWidth={2.6} />
    </svg>
  );
}

/** Web: a globe. */
export function GlobeIcon({ className = "size-7" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className={className} {...STROKE}>
      <circle cx="16" cy="16" r="11.5" />
      <path d="M4.5 16h23" />
      <path d="M16 4.5c3.2 3.3 4.8 7.1 4.8 11.5S19.2 24.2 16 27.5c-3.2-3.3-4.8-7.1-4.8-11.5S12.8 7.8 16 4.5Z" />
      <path d="M6.3 9.8h19.4M6.3 22.2h19.4" />
    </svg>
  );
}

/** A small live dot with a slow ring. The ring only moves when motion is welcome. */
export function LiveDot({ className = "bg-starlight" }: IconProps) {
  return (
    <span aria-hidden="true" className="relative inline-flex size-2 shrink-0">
      <span className={`absolute inset-0 rounded-full ${className} ${css.pulseRing}`} />
      <span className={`relative inline-flex size-2 rounded-full ${className}`} />
    </span>
  );
}
