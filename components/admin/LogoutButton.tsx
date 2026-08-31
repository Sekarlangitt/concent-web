"use client";

import { useFormStatus } from "react-dom";
import { logoutAdmin } from "@/app/admin/actions";

/**
 * Logout button (STEP 9).
 *
 * A real <button> inside a <form> that posts to the logoutAdmin server action
 * — never client-side cookie manipulation. The button is disabled while the
 * request is in flight.
 */
export function LogoutButton() {
  return (
    <form action={logoutAdmin}>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Signing out..." : "Logout"}
    </button>
  );
}
