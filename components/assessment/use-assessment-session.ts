"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  clearAssessmentSession,
  getAssessmentSession,
  type AssessmentSession,
} from "@/lib/assessment-session";

function subscribe(): () => void {
  return () => {};
}

/**
 * Sentinel returned by the server snapshot. It distinguishes "not yet read on
 * the client" (server/hydration render) from "confirmed: no session exists",
 * so the redirect only happens after the client has actually read
 * sessionStorage. Prevents clearing a valid session during hydration.
 */
const PENDING = Symbol("presuniv-assessment-pending");

/**
 * Reads the assessment session from sessionStorage on the client.
 *
 * Uses useSyncExternalStore so the server/hydration snapshot is the PENDING
 * sentinel (no hydration mismatch) and the real session appears right after
 * hydration. When the client confirms there is no valid session, it clears it
 * and redirects to "/".
 */
export function useAssessmentSession() {
  const router = useRouter();

  const snapshot = useSyncExternalStore<
    AssessmentSession | null | typeof PENDING
  >(subscribe, getAssessmentSession, () => PENDING);

  useEffect(() => {
    if (snapshot === null) {
      clearAssessmentSession();
      router.replace("/");
    }
  }, [snapshot, router]);

  return {
    session: snapshot === PENDING ? null : snapshot,
    isReady: snapshot !== PENDING,
  };
}
