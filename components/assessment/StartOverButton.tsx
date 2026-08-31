"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { clearAssessmentSession } from "@/lib/assessment-session";
import { ConfirmDialog } from "@/components/assessment/ConfirmDialog";

type StartOverButtonProps = {
  /** Whether the assessment already holds answers (triggers confirmation). */
  hasAnswers: boolean;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Disables the action, e.g. while an assessment is being submitted. */
  disabled?: boolean;
};

/**
 * Start Over action with an accessible confirmation dialog.
 *
 * When the assessment contains answers, clicking Start Over opens a modal
 * ("Start over? Your current questionnaire answers will be cleared.") with
 * Cancel / Start Over actions. Confirmation clears the temporary
 * sessionStorage session (answers, current position, edit state) and returns
 * to "/". With no answers stored, the dialog is skipped and the action runs
 * directly.
 *
 * No database records exist yet, so clearing the session is sufficient.
 */
export function StartOverButton({
  hasAnswers,
  label = "Start Over",
  className = "",
  size = "md",
  disabled = false,
}: StartOverButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const closeDialog = useCallback(() => setConfirmOpen(false), []);

  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    clearAssessmentSession();
    router.replace("/");
  }, [router]);

  function handleClick() {
    if (disabled) {
      return;
    }
    if (hasAnswers) {
      setConfirmOpen(true);
    } else {
      clearAssessmentSession();
      router.replace("/");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size={size}
        onClick={handleClick}
        disabled={disabled}
        className={className}
      >
        {label}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        title="Start over?"
        description="Your current questionnaire answers will be cleared."
        confirmLabel="Start Over"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </>
  );
}
