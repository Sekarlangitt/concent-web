import { z } from "zod";

/**
 * Server-side validation for the admin login form (STEP 9, requirement 12).
 *
 * Browser validation is only a convenience layer — every login submission is
 * validated again here with Zod:
 *  - email: required, valid format, trimmed and lowercased for normalization
 *  - password: required
 *
 * Validation failures are distinct from authentication failures: malformed
 * input gets a "please check your fields" message, while valid-looking input
 * that does not match an admin gets the generic "Invalid email or password."
 */

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Please enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
