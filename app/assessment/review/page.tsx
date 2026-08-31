import type { Metadata } from "next";
import { AssessmentSessionGate } from "@/components/assessment/AssessmentSessionGate";

export const metadata: Metadata = {
  title: "Review Your Answers | President University",
  description:
    "Review your answers before completing the President University concentration assessment.",
};

export default function AssessmentReviewPage() {
  return <AssessmentSessionGate variant="review" />;
}
