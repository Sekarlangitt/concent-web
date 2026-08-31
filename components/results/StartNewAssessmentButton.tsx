"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { clearAssessmentSession } from "@/lib/assessment-session";
import { clearCompletedAssessmentMarker } from "@/lib/completed-assessment";

/**
 * Start New Assessment action for the result page.
 *
 * Clears any remaining temporary assessment session (and the completion
 * marker) in sessionStorage, then navigates to the landing page. The completed
 * assessment remains in PostgreSQL — this action never deletes database
 * records, which are preserved for later admin reporting.
 */
export function StartNewAssessmentButton() {
  const router = useRouter();

  function handleStartNew() {
    clearAssessmentSession();
    clearCompletedAssessmentMarker();
    router.push("/");
  }

  return (
    <Button type="button" size="lg" onClick={handleStartNew}>
      Start New Assessment
    </Button>
  );
}
