import { RecruiterPortal } from "@/components/RecruiterPortal";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Architect Evaluation Portal | Ink of the Forgotten Path",
  description: "Live interactive subsystem verification and benchmark portal proving resume capabilities with zero fluff.",
};

export default function RecruiterPage() {
  return <RecruiterPortal />;
}
