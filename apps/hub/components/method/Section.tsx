// Section frame for /method: a hairline above, a headline, an optional lede.
import { h2, lede as ledeStyle } from "@/lib/ui";

export default function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6 border-t border-rule py-10 sm:py-14">
      <h2 id={`${id}-h`} className={h2}>
        {title}
      </h2>
      {lede && <p className={`mt-4 max-w-[64ch] ${ledeStyle}`}>{lede}</p>}
      {children}
    </section>
  );
}
