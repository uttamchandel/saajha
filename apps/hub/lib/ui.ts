// The family's shared class recipes. The hub and the state node (apps/node) use the same
// shapes: soft cards, rounded-xl buttons, round pills, forest on paper. Padding is left to the caller
// for cards, so one recipe fits a tile and a panel. Night variants sit on bg-night or bg-forest.

// ---- surfaces
export const card = "rounded-2xl border border-forest/15 bg-white";
export const cardNight = "rounded-2xl border border-white/10 bg-white/5";
/** A form or slip that travels: dashed, the colour of leaf mist. */
export const slip = "rounded-2xl border border-dashed border-forest/30 bg-carbon-wash";

// ---- callouts (always with words or an icon; never colour alone)
export const noteGood = "rounded-xl border border-leaf/25 bg-carbon-wash";
export const noteBad = "rounded-xl border border-clay/25 bg-clay/5";
export const noteWarn = "rounded-xl border border-turmeric/30 bg-turmeric-soft/15";

// ---- buttons
const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const primary = "bg-forest text-paper hover:bg-leaf disabled:hover:bg-forest";
const secondary =
  "border border-forest/25 bg-white text-forest hover:border-forest/50 hover:bg-leaf-mist/50 disabled:hover:border-forest/25 disabled:hover:bg-white";
export const btnPrimary = `${btn} ${primary} px-5 py-3 text-base`;
export const btnPrimarySm = `${btn} ${primary} px-4 py-2 text-[15px]`;
export const btnSecondary = `${btn} ${secondary} px-5 py-3 text-base`;
export const btnSecondarySm = `${btn} ${secondary} px-3 py-1.5 text-sm`;
/** On night: gold is the primary action (and, elsewhere, only what crosses a border). */
export const btnGold = `${btn} bg-gold px-6 py-3.5 text-base text-night hover:bg-[#fcd34d]`;
export const btnGhostNight = `${btn} border border-paper/25 bg-white/5 px-6 py-3.5 text-base text-paper hover:border-paper/50 hover:bg-white/10`;

// ---- links
export const link = "text-leaf underline decoration-leaf/40 underline-offset-4 hover:text-forest hover:decoration-forest";
export const linkNight = "text-paper underline decoration-paper/40 underline-offset-4 hover:decoration-paper";

// ---- small marks
export const pill = "inline-flex items-center gap-2 rounded-full bg-leaf-mist px-3 py-1.5 text-xs font-semibold text-forest";
export const pillWarn = "inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-clay";
export const pillNight = "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-paper";
export const chip = "inline-flex items-center gap-1.5 rounded-full border border-forest/15 bg-white px-3 py-1.5 text-sm";
export const chipNight = "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm";
export const label = "text-xs font-semibold uppercase tracking-widest text-ink-soft";
export const labelNight = "text-xs font-semibold uppercase tracking-widest text-paper/60";
export const iconTile = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-leaf-mist text-forest";
export const iconTileNight = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-paper";

// ---- form controls
export const input = "w-full rounded-xl border border-forest/20 bg-paper px-3 py-2.5 text-[15px] text-ink focus:border-forest";
/** A choice among a few (photos, test cases): add `choiceOn` to the selected one. */
export const choice = "rounded-xl border border-forest/20 bg-white transition-colors hover:border-forest/50";
export const choiceOn = "rounded-xl border border-forest bg-white ring-2 ring-forest";

// ---- type
export const h1 = "display text-balance text-forest text-[clamp(2rem,4.8vw,3.3rem)]";
export const h2 = "display text-balance text-forest text-[clamp(1.5rem,3.2vw,2.1rem)]";
export const lede = "text-lg leading-relaxed text-ink-soft";
/** A headline figure: Fraunces, as on the node's stat band. */
export const figure = "font-display font-semibold leading-none";
