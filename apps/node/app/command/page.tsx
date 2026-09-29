import type { Metadata } from "next";
import CommandClient from "@/components/CommandClient";

export const metadata: Metadata = {
  title: "KisanVaani Ops — District Command Center",
  description:
    "Operations console for District Agriculture Officers: weather alerts, disease outbreak clusters, RSK/KVK escalation queue, farmer broadcasts and registry.",
};

export default function CommandPage() {
  return <CommandClient />;
}
