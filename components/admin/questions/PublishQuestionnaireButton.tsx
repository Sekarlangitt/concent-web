"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/assessment/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { publishQuestionnaireAction } from "@/lib/admin/questionnaire-actions";

/**
 * Publish button with the required confirmation dialog. Only enabled when the
 * draft passes server-side validation (the action re-validates inside the
 * publish transaction anyway).
 */
export function PublishQuestionnaireButton({
  versionId,
  disabled,
  hasDraft,
}: {
  versionId: string;
  disabled: boolean;
  hasDraft: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hasDraft) {
    return null;
  }

  function handlePublish() {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await publishQuestionnaireAction(versionId);
      if (!result.ok) {
        setError(result.error ?? "Could not publish the questionnaire.");
      }
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant="accent"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Publish Questionnaire
      </Button>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-800">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={open}
        title="Publish this questionnaire?"
        description="Students who start a new assessment after publishing will receive this version. Existing assessment attempts will continue using their original version."
        confirmLabel="Publish"
        cancelLabel="Cancel"
        pending={pending}
        pendingConfirmLabel="Publishing…"
        onConfirm={handlePublish}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
