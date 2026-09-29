// Section frame for /method: a hairline above, a wide headline, an optional lede.
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
      <h2 id={`${id}-h`} className="display text-[clamp(1.5rem,3.2vw,2.1rem)]">
        {title}
      </h2>
      {lede && <p className="mt-4 max-w-[64ch] text-lg leading-relaxed text-muted">{lede}</p>}
      {children}
    </section>
  );
}
