import type { Metadata } from "next";
import { AssessmentSessionGate } from "@/components/assessment/AssessmentSessionGate";

export const metadata: Metadata = {
  title: "Assessment Questions | President University",
  description:
    "Answer 20 questions to discover the President University concentration that best matches your interests.",
};

export default function AssessmentQuestionsPage() {
  return <AssessmentSessionGate variant="questions" />;
}
