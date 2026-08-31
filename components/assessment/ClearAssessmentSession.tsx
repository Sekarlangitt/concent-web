"use client";

import { useEffect } from "react";
import {
  clearAssessmentSession,
  getAssessmentSession,
} from "@/lib/assessment-session";
import { getCompletedAssessmentMarker } from "@/lib/completed-assessment";

/**
 * Clears the questionnaire session after a successful submission so the
 * submitted answers cannot be resubmitted from browser Back navigation.
 *
 * Only clears the session when it matches the assessment that was just
 * completed (the student name and major recorded in the completion marker),
 * so a different in-progress assessment is never touched.
 */
export function ClearAssessmentSession() {
  useEffect(() => {
    const marker = getCompletedAssessmentMarker();
    const session = getAssessmentSession();
    if (
      marker &&
      session &&
      marker.fullName === session.fullName &&
      marker.major === session.major
    ) {
      clearAssessmentSession();
    }
  }, []);

  return null;
}
