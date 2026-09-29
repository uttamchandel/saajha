"use client";

// Step 1: a photo. Upload one, take one on a phone, or pick a held-out test photo whose
// expert label is known (so a reviewer can check the verdicts against it).
import Image from "next/image";
import { useId } from "react";
import { classLabel } from "@/lib/classes";
import type { GalleryItem } from "@/lib/contract";

const btn =
  "inline-flex cursor-pointer items-center rounded-md px-4 py-2.5 text-base font-semibold focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-carbon";

export default function PhotoPicker({
  gallery,
  selectedId,
  busy,
  onFile,
  onGallery,
}: {
  gallery: GalleryItem[];
  selectedId: string | null;
  busy: boolean;
  onFile: (f: File) => void;
  onGallery: (item: GalleryItem) => void;
}) {
  const uploadId = useId();
  const cameraId = useId();
  const sources = [...new Set(gallery.map((g) => g.source))];

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // picking the same file again should still fire
    if (f) onFile(f);
  };

  return (
    <section aria-labelledby="pick-h" className="border-t border-rule pt-8">
      <h2 id="pick-h" className="display text-[clamp(1.4rem,3vw,1.9rem)]">
        Choose a paddy photo
      </h2>
      <p className="mt-2 max-w-[62ch] text-muted">
        A close photo of the affected leaves works best. The image model runs in this browser; the photo also goes to
        Google&apos;s Gemini API for a second opinion. Saajha does not store it.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <label htmlFor={uploadId} className={`${btn} bg-ink text-white hover:bg-[#2a3888]`}>
          Upload a photo
          <input id={uploadId} type="file" accept="image/*" className="sr-only" onChange={pick} disabled={busy} />
        </label>
        <label htmlFor={cameraId} className={`${btn} border border-ink bg-sheet text-ink hover:bg-carbon-wash`}>
          Take a photo with your phone
          <input
            id={cameraId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={pick}
            disabled={busy}
          />
        </label>
      </div>

      <h3 className="mt-8 text-lg font-semibold">Or use a held-out test photo</h3>
      <p className="mt-1 max-w-[62ch] text-sm text-muted">
        None of these photos was used to train any state&apos;s model. Each carries the label an expert gave it, so you
        can check both verdicts against it.
      </p>
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6" role="list">
        {gallery.map((g) => {
          const on = g.id === selectedId;
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onGallery(g)}
                aria-pressed={on}
                disabled={busy}
                className={`group block w-full overflow-hidden rounded-md border text-left disabled:cursor-wait ${
                  on ? "border-ink ring-2 ring-ink" : "border-rule hover:border-carbon"
                } bg-sheet`}
              >
                <Image
                  src={g.image_url}
                  alt={`Paddy leaves, expert label ${classLabel(g.true_key).toLowerCase()}`}
                  width={240}
                  height={320}
                  sizes="(min-width: 640px) 16vw, 33vw"
                  className="aspect-[3/4] h-auto w-full object-cover"
                />
                <span className="block px-2 py-1.5 text-[13px] leading-tight">
                  <span className="font-semibold">{classLabel(g.true_key)}</span>
                  {g.hero && <span className="block text-muted">The photo from the flip</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {sources.map((s) => (
        <p key={s} className="mt-2 text-xs text-muted">
          Photos: {s}.
        </p>
      ))}
    </section>
  );
}
