import type { Metadata } from "next";
import WhatsAppClient from "@/components/WhatsAppClient";

export const metadata: Metadata = {
  title: "WhatsApp channel — KisanVaani",
  description:
    "Simulated WhatsApp Business flow: send a crop photo or a voice note and receive a diagnosis as a voice note. Includes the live wa.me deep link and the Cloud API production path.",
};

export default function WhatsAppPage() {
  return <WhatsAppClient />;
}
