import type { Metadata } from "next";
import RecommendClient from "@/components/RecommendClient";

export const metadata: Metadata = {
  title: "Crop advisor — KisanVaani",
  description:
    "Ranked crop recommendations for your plot, built from ISRIC satellite soil grids, Soil Health Card records, a 16-day Open-Meteo forecast and Agmarknet mandi prices, applied against ICAR agronomy.",
};

export default function RecommendPage() {
  return <RecommendClient />;
}
