import type { Metadata } from "next";
import DemoClient from "@/components/DemoClient";

export const metadata: Metadata = {
  title: "Farmer demo — Saajha state node",
  description: "Simulated farmer experience: IVR voice call, SMS advisory, and photo diagnosis on a feature phone.",
};

export default function DemoPage() {
  return <DemoClient />;
}
