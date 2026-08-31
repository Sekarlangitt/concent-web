"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteAssessmentRecord } from "@/lib/admin/assessments";
import { requireAdmin } from "@/lib/auth/admin";
import {
  ADMIN_ASSESSMENTS_ROUTE,
  ADMIN_DASHBOARD_ROUTE,
} from "@/lib/auth/config";

/**
 * STEP 11 assessment deletion server action.
 *
 * Deletion is a POST-only server action — never a GET URL that mutates state.
 * Every mutation re-verifies the admin session server-side with requireAdmin()
 * (the page-level guard is never trusted on its own).
 *
 * Flow:
 *   1. Validate the assessment id (delete by unique id only, never by name).
 *   2. requireAdmin() — redirects to /admin/login when logged out.
 *   3. deleteAssessmentRecord() — deletes the Assessment; the schema-level
 *      cascade removes all answers and concentration scores.
 *   4. Revalidate the dashboard + list so aggregates update immediately.
 *   5. redirect() to /admin/assessments — both the list and the detail page
 *      end here, so a deleted detail route is never left stale.
 *
 * Outcomes returned to the client (no raw Prisma errors ever):
 *   - "not-found": the record was already removed.
 *   - "server": the deletion failed — show a generic retry message.
 */

const assessmentIdSchema = z.string().trim().min(1).max(100);

export type DeleteAssessmentResult =
  | { ok: true }
  | { ok: false; error: "not-found" | "server" };

export async function deleteAssessment(
  assessmentId: string,
): Promise<DeleteAssessmentResult> {
  const parsed = assessmentIdSchema.safeParse(assessmentId);
  if (!parsed.success) {
    // Not a usable id — the record is effectively gone.
    return { ok: false, error: "not-found" };
  }

  // Authorization boundary: throws NEXT_REDIRECT (handled by Next) when the
  // visitor has no valid admin session. Never catches it below.
  await requireAdmin();

  let deleted = false;
  try {
    deleted = await deleteAssessmentRecord(parsed.data);
  } catch (error) {
    // Log technical details server-side; never expose SQL/Prisma internals.
    console.error("[admin/assessments] delete failed", {
      assessmentId: parsed.data,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, error: "server" };
  }

  if (!deleted) {
    return { ok: false, error: "not-found" };
  }

  revalidatePath(ADMIN_DASHBOARD_ROUTE);
  revalidatePath(ADMIN_ASSESSMENTS_ROUTE);
  redirect(ADMIN_ASSESSMENTS_ROUTE);
}
