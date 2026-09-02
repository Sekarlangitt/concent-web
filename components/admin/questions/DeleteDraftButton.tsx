"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/assessment/ConfirmDialog";
import { deleteDraftAction } from "@/lib/admin/questionnaire-actions";

/** Deletes a DRAFT version after an accessible confirmation. */
export function DeleteDraftButton({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await deleteDraftAction(versionId);
      if (!result.ok) {
        setError(result.error ?? "Could not delete the draft.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={pending}
        className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-accent-200 bg-white px-3.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-50 disabled:pointer-events-none disabled:opacity-60"
      >
        Delete Draft
      </button>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm font-medium text-accent-800">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={open}
        title="Delete this draft?"
        description="The draft and all of its questions, options, and weights will be permanently removed. Published and archived versions are never affected."
        confirmLabel="Delete Draft"
        pending={pending}
        pendingConfirmLabel="Deleting…"
        onConfirm={handleDelete}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
