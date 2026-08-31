"use client";

import { useActionState } from "react";
import { loginAdmin, type LoginFormState } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";

const initialState: LoginFormState = { status: "idle" };

/**
 * Admin login form (STEP 9).
 *
 * Submits to the loginAdmin server action via useActionState, so validation,
 * the credential check, the HttpOnly cookie, and the redirect all happen
 * server-side. While pending, the Sign In button is disabled ("Signing in...")
 * to prevent accidental repeated submissions. Credentials never live in
 * client state beyond the form fields themselves.
 */
export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="space-y-5">
      <FormField
        label="Email Address"
        name="email"
        type="email"
        placeholder="admin@president.ac.id"
        autoComplete="username"
        required
        disabled={pending}
        error={emailError}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
        disabled={pending}
        error={passwordError}
      />

      {state.message ? (
        <p
          role="alert"
          className="rounded-lg border border-accent-200 bg-accent-50 px-3 py-2.5 text-sm font-medium text-accent-800"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

