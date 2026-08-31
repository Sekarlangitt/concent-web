import type { Metadata } from "next";
import { AssessmentSessionGate } from "@/components/assessment/AssessmentSessionGate";

export const metadata: Metadata = {
  title: "Concentration Assessment | President University",
  description:
    "Begin the President University concentration assessment to discover the concentration that best matches your interests.",
};

export default function AssessmentPage() {
  return <AssessmentSessionGate variant="introduction" />;
}
