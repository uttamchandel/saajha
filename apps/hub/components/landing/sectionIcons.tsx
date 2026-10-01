// Icons for the landing's lower sections: lucide-react, the same set the state node uses, so an arrow or a
// phone is drawn the same way in both apps. LiveDot is the one custom mark. Every icon is decorative: the text
// beside it carries the meaning, so all are aria-hidden. Callers size and colour them through `className`.
import {
  ArrowDown as ArrowDownGlyph,
  ArrowRight as ArrowRightGlyph,
  ArrowUpRight as ArrowUpRightGlyph,
  Check,
  Globe,
  Lock as LockGlyph,
  MessageCircle,
  MessageSquare,
  Phone,
} from "lucide-react";
import css from "./sections.module.css";

type IconProps = { className?: string };

export function ArrowRight({ className = "size-4" }: IconProps) {
  return <ArrowRightGlyph aria-hidden="true" className={className} />;
}

export function ArrowDown({ className = "size-4" }: IconProps) {
  return <ArrowDownGlyph aria-hidden="true" className={className} />;
}

export function ArrowUpRight({ className = "size-4" }: IconProps) {
  return <ArrowUpRightGlyph aria-hidden="true" className={className} />;
}

export function Tick({ className = "size-4" }: IconProps) {
  return <Check aria-hidden="true" className={className} strokeWidth={2.5} />;
}

export function Lock({ className = "size-4" }: IconProps) {
  return <LockGlyph aria-hidden="true" className={className} />;
}

/** Voice call: a handset. */
export function PhoneIcon({ className = "size-7" }: IconProps) {
  return <Phone aria-hidden="true" className={className} />;
}

/** SMS: a message, as on the node's SMS card. */
export function SmsIcon({ className = "size-7" }: IconProps) {
  return <MessageSquare aria-hidden="true" className={className} />;
}

/** Chat: a speech bubble (WhatsApp's own mark is not ours to draw). */
export function ChatIcon({ className = "size-7" }: IconProps) {
  return <MessageCircle aria-hidden="true" className={className} />;
}

/** Web: a globe. */
export function GlobeIcon({ className = "size-7" }: IconProps) {
  return <Globe aria-hidden="true" className={className} />;
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
