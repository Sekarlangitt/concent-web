"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteAssessment } from "@/app/admin/(protected)/assessments/actions";
import { ConfirmDialog } from "@/components/assessment/ConfirmDialog";
import { ADMIN_ASSESSMENTS_ROUTE } from "@/lib/auth/config";

/**
 * STEP 11 safe-delete button.
 *
 * Delete is never a browser confirm() nor a GET link. Clicking Delete opens
 * the accessible ConfirmDialog (focus management, Escape/Cancel, red
 * destructive action); confirming calls the server action, which re-checks the
 * admin session server-side, deletes by unique id, revalidates the dashboard
 * and list, and redirects to /admin/assessments.
 *
 * Error outcomes from the action are shown without exposing internals:
 *  - "not-found": the record is already gone — the list refreshes in place
 *    (or, on the detail page, the admin is sent back to the list).
 *  - "server": a generic retry message is displayed.
 */

export const ASSESSMENT_DELETE_SERVER_ERROR =
  "We couldn't delete this assessment. Please try again.";

type DeleteAssessmentButtonProps = {
  assessmentId: string;
  studentName: string;
  /** Where the record lives: the list refreshes in place; the detail navigates back. */
  context?: "list" | "detail";
};

export function DeleteAssessmentButton({
  assessmentId,
  studentName,
  context = "list",
}: DeleteAssessmentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openDialog() {
    setErrorMessage(null);
    setOpen(true);
  }

  function handleConfirm() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await deleteAssessment(assessmentId);
      if (!result) {
        // Success: the server action redirected the browser away.
        return;
      }
      setOpen(false);
      if (!result.ok && result.error === "not-found") {
        if (context === "detail") {
          router.replace(ADMIN_ASSESSMENTS_ROUTE);
        } else {
          router.refresh();
        }
      } else if (!result.ok) {
        setErrorMessage(ASSESSMENT_DELETE_SERVER_ERROR);
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={openDialog}
        disabled={isPending}
        aria-label={`Delete assessment for ${studentName}`}
        className="focus-ring inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-accent-200 bg-white px-3 py-1.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-50 disabled:pointer-events-none disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Delete"}
      </button>

      {errorMessage ? (
        <p role="alert" className="text-sm font-medium text-accent-700">
          {errorMessage}
        </p>
      ) : null}

      <ConfirmDialog
        open={open}
        title="Delete Assessment?"
        description={`This will permanently remove the assessment for ${studentName}, including all saved answers and concentration scores. This action cannot be undone.`}
        confirmLabel="Delete Assessment"
        cancelLabel="Cancel"
        pending={isPending}
        pendingConfirmLabel="Deleting..."
        onConfirm={handleConfirm}
        onCancel={() => {
          setErrorMessage(null);
          setOpen(false);
        }}
      />
    </div>
  );
}
