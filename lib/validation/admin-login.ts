import { z } from "zod";

/**
 * Server-side validation for the admin login form.
 *
 * Browser validation is only a convenience layer — every login submission is
 * validated again here with Zod:
 *  - username: required, trimmed, lowercased, max 50 chars, letters/digits
 *    and common separators only
 *  - password: required
 *
 * Validation failures are distinct from authentication failures: malformed
 * input gets a "please check your fields" message, while valid-looking input
 * that does not match an admin gets the generic "Invalid username or
 * password."
 */

export const adminLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required.")
    .max(50, "Username must be 50 characters or fewer.")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Username can only contain letters, numbers, dots, underscores, and hyphens.",
    )
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

